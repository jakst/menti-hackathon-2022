import { Env } from './types';

export class Presentation {
  voterSessions: WebSocket[] = [];
  presenterSessions: WebSocket[] = [];

  paceState = {
    currentSlide: 0,
  };

  constructor(private state: DurableObjectState, private env: Env) {}

  async handlePresenterJoined(webSocket: WebSocket) {
    this.presenterSessions.push(webSocket);

    webSocket.addEventListener('close', () => {
      console.log('DOH, closing...');
      this.presenterSessions = this.voterSessions.filter(
        (session) => session !== webSocket,
      );
    });
  }

  async handleVoterJoined(webSocket: WebSocket) {
    this.voterSessions.push(webSocket);

    this.broadcastToAll({
      type: 'VOTER_CHANGE',
      payload: { voterCount: this.voterSessions.length },
    });

    webSocket.addEventListener('close', () => {
      console.log('DOH, closing...');
      this.voterSessions = this.voterSessions.filter(
        (session) => session !== webSocket,
      );

      this.broadcastToAll({
        type: 'VOTER_CHANGE',
        payload: { voterCount: this.voterSessions.length },
      });
    });
  }

  broadcastToAll(data: unknown) {
    const payload = JSON.stringify(data);

    this.presenterSessions.forEach((webSocket) => webSocket.send(payload));
    this.voterSessions.forEach((webSocket) => webSocket.send(payload));
  }

  broadcastToPresenters(data: unknown) {
    const payload = JSON.stringify(data);

    this.presenterSessions.forEach((webSocket) => webSocket.send(payload));
  }

  broadcastToVoters(data: unknown) {
    const payload = JSON.stringify(data);

    this.voterSessions.forEach((webSocket) => webSocket.send(payload));
  }

  async handleSession(webSocket: WebSocket, isPresenter: boolean) {
    console.log('HANDLING WS SESSION', { isPresenter });
    // Accept our end of the WebSocket. This tells the runtime that we'll be terminating the
    // WebSocket in JavaScript, not sending it elsewhere.
    webSocket.accept();

    webSocket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') throw new Error('Invalid ws event');

      console.log('GOT MESSAGE', event.data);

      const payload = JSON.parse(event.data);

      if (payload.type === 'CLIENT_READY') {
        webSocket.send(
          JSON.stringify({ type: 'PACE_CHANGE', payload: this.paceState }),
        );
      } else if (payload.type === 'PING') {
        webSocket.send(JSON.stringify({ type: 'PONG' }));
      } else if (payload.type === 'NEXT_SLIDE') {
        this.paceState.currentSlide++;
        this.broadcastToAll({ type: 'PACE_CHANGE', payload: this.paceState });
      } else if (payload.type === 'PREVIOUS_SLIDE') {
        this.paceState.currentSlide = Math.max(
          0,
          this.paceState.currentSlide - 1,
        );
        this.broadcastToAll({ type: 'PACE_CHANGE', payload: this.paceState });
      }
    });

    if (isPresenter) await this.handlePresenterJoined(webSocket);
    else await this.handleVoterJoined(webSocket);
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/storage-region':
        let colo = await this.state.storage.get<string>('colo');
        if (!colo) {
          colo = request.cf!.colo;
          this.state.storage.put('colo', colo);
        }
        return new Response(JSON.stringify({ colo }, null, 2), {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        });

      case '/presenter/websocket':
        if (request.headers.get('Upgrade') != 'websocket')
          return new Response('expected websocket', { status: 400 });

        const pair = new WebSocketPair();

        // We're going to take pair[1] as our end, and return pair[0] to the client.
        await this.handleSession(
          pair[1],
          request.headers.get('IAmPresenter') === 'true',
        );

        return new Response(null, { status: 101, webSocket: pair[0] });
      default:
        return new Response('Not found', { status: 404 });
    }
  }
}

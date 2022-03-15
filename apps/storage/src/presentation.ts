import { Env } from './types';

interface Slide {
  id: string;
  value: string;
  likes: number;
}

interface PresentationState {
  currentSlide: number;
  numberOfVoters: number;
  slides: Slide[];
}

export class Presentation {
  voterSessions: WebSocket[] = [];
  presenterSessions: WebSocket[] = [];

  presentationState: PresentationState = {
    currentSlide: 0,
    numberOfVoters: 0,
    slides: [],
  };

  constructor(private state: DurableObjectState, private env: Env) {}

  async handlePresenterJoined(webSocket: WebSocket) {
    this.presenterSessions.push(webSocket);

    webSocket.addEventListener('close', () => {
      console.log('DOH, closing...');
      this.presenterSessions = this.presenterSessions.filter(
        (session) => session !== webSocket,
      );
    });
  }

  async handleVoterJoined(webSocket: WebSocket) {
    this.voterSessions.push(webSocket);

    this.presentationState.numberOfVoters = this.voterSessions.length;

    this.broadcastToPresenters({
      type: 'PACE_CHANGE',
      payload: this.presentationState,
    });

    webSocket.addEventListener('close', () => {
      console.log('DOH, closing...');
      this.voterSessions = this.voterSessions.filter(
        (session) => session !== webSocket,
      );

      this.presentationState.numberOfVoters = this.voterSessions.length;

      this.broadcastToPresenters({
        type: 'PACE_CHANGE',
        payload: this.presentationState,
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

      const payload = JSON.parse(event.data);

      if (payload.type === 'CLIENT_READY') {
        webSocket.send(
          JSON.stringify({
            type: 'INITIAL_STATE',
            payload: this.presentationState,
          }),
        );
      } else if (payload.type === 'PING') {
        webSocket.send(JSON.stringify({ type: 'PONG' }));
      } else if (payload.type === 'UPDATE_SLIDES') {
        this.presentationState.slides = payload.payload;
        this.broadcastToAll({
          type: 'PACE_CHANGE',
          payload: this.presentationState,
        });
      } else if (payload.type === 'NEXT_SLIDE') {
        const nextSlide = Math.min(
          this.presentationState.slides.length - 1,
          this.presentationState.currentSlide + 1,
        );
        if (nextSlide !== this.presentationState.currentSlide) {
          this.presentationState.currentSlide = nextSlide;
          this.broadcastToAll({
            type: 'PACE_CHANGE',
            payload: this.presentationState,
          });
        }
      } else if (payload.type === 'PREVIOUS_SLIDE') {
        const nextSlide = Math.max(0, this.presentationState.currentSlide - 1);
        if (nextSlide !== this.presentationState.currentSlide) {
          this.presentationState.currentSlide = nextSlide;
          this.broadcastToAll({
            type: 'PACE_CHANGE',
            payload: this.presentationState,
          });
        }
      } else if (payload.type === 'LIKE') {
        if (this.presentationState.slides.length > 0)
          this.presentationState.slides[this.presentationState.currentSlide]
            .likes++;
        this.broadcastToAll({
          type: 'PACE_CHANGE',
          payload: this.presentationState,
        });
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

      case '/presenter/websocket': {
        if (request.headers.get('Upgrade') != 'websocket')
          return new Response('expected websocket', { status: 400 });

        const pair = new WebSocketPair();

        // We're going to take pair[1] as our end, and return pair[0] to the client.
        await this.handleSession(pair[1], true);

        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      case '/voter/websocket': {
        if (request.headers.get('Upgrade') != 'websocket')
          return new Response('expected websocket', { status: 400 });

        const pair = new WebSocketPair();

        // We're going to take pair[1] as our end, and return pair[0] to the client.
        await this.handleSession(pair[1], false);

        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      default:
        return new Response('Not found', { status: 404 });
    }
  }
}

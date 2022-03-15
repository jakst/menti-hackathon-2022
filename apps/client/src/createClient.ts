export interface Slide {
  id: string;
  value: string;
  likes: number;
}

export interface PresentationState {
  currentSlide: number;
  numberOfVoters: number;
  slides: Slide[];
}

export type Event =
  | {
      type: 'PONG';
      payload: never;
    }
  | {
      type: 'PACE_CHANGE';
      payload: PresentationState;
    }
  | {
      type: 'INITIAL_STATE';
      payload: PresentationState;
    };

interface ClientOptions {
  voteCode: string;
  isVoter?: true;
  onConnect?: (data: PresentationState) => void;
  onDisconnect?: () => void;
  onPaceChange?: (data: PresentationState) => void;
  onPingPong?: (time: number) => void;
}

export function createClient(options: ClientOptions) {
  let socket = new WebSocket(
    `${process.env.NEXT_PUBLIC_STORAGE_REALTIME_URL}/${options.voteCode}/${
      options.isVoter ? 'voter' : 'presenter'
    }/websocket`,
  );
  let pingTime = 0;
  let pingInterval: ReturnType<typeof setInterval>;

  function onOpen() {
    console.log('SOCKET IS OPEN');
    socket.send(JSON.stringify({ type: 'CLIENT_READY' }));
    pingInterval = setInterval(() => {
      pingTime = Date.now();
      socket.send(JSON.stringify({ type: 'PING' }));
    }, 2000);
  }

  function onClose() {
    console.log('FECK, closing...');
    options.onDisconnect?.();

    clearInterval(pingInterval);
  }

  function onMessage(e: WebSocketEventMap['message']) {
    // Set ready when we have received the first piece of data

    const message = JSON.parse(e.data) as Event;
    if (message.type !== 'PONG') console.log('WS EVENT', e.data);

    if (message.type === 'PONG') options.onPingPong?.(Date.now() - pingTime);
    else if (message.type === 'INITIAL_STATE') {
      options.onConnect?.(message.payload);
    } else if (message.type === 'PACE_CHANGE')
      options.onPaceChange?.(message.payload);
  }

  socket.addEventListener('open', onOpen);
  socket.addEventListener('close', onClose);
  socket.addEventListener('message', onMessage);
  return {
    close() {
      socket.close();
    },
    nextSlide() {
      console.log('Sending nextSlide()');
      socket.send(JSON.stringify({ type: 'NEXT_SLIDE' }));
    },
    previousSlide() {
      console.log('Sending previousSlide()');
      socket.send(JSON.stringify({ type: 'PREVIOUS_SLIDE' }));
    },
    updateSlides(slides: Slide[]) {
      socket.send(JSON.stringify({ type: 'UPDATE_SLIDES', payload: slides }));
    },
    like() {
      socket.send(JSON.stringify({ type: 'LIKE' }));
    },
  };
}

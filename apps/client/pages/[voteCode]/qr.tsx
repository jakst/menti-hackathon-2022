import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { createClient, PresentationState, Slide } from '../../src/createClient';
import QRCode from 'react-qr-code';

export default function PresentPage() {
  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  if (!voteCode) return null;
  return <PageContents />;
}

function PageContents() {
  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  const [presentation, setPresentation] = useState<PresentationState | null>(
    null,
  );

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      if (event.code === 'Escape') router.push(`/${voteCode}/present`);
    }

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const client = createClient({
      voteCode,
      onConnect(value) {
        setPresentation(value);
      },
      onDisconnect() {},
      onPingPong(value) {},
      onPaceChange(value) {
        setPresentation(value);
      },
    });

    clientRef.current = client;

    document.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowRight') client.nextSlide();
      if (event.code === 'ArrowLeft') client.previousSlide();
    });

    return () => {
      client.close();
    };
  }, []);

  return (
    <div>
      <h2>{voteCode}</h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <QRCode value={`${location.origin}/${voteCode}`} />
        <h1>Voters: {presentation?.numberOfVoters ?? 0}</h1>
      </div>
    </div>
  );
}

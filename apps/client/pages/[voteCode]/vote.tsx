import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { createClient, PresentationState } from '../../src/createClient';
import { useRegionData } from '../../src/useRegionData';

export default function VotePage() {
  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  if (!voteCode) return null;
  return <PageContents />;
}

function PageContents() {
  const regionData = useRegionData();

  const [ping, setPing] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [presentation, setPresentation] = useState<PresentationState | null>(
    null,
  );

  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const client = createClient({
      voteCode,
      isVoter: true,
      onConnect(value) {
        setPresentation(value);
        setIsConnected(true);
      },
      onDisconnect() {
        setIsConnected(false);
      },
      onPingPong(value) {
        setPing(value);
      },
      onPaceChange(value) {
        setPresentation(value);
      },
    });

    clientRef.current = client;

    return () => {
      client.close();
    };
  }, []);

  const isReady = isConnected && presentation !== null;

  const currentSlide = presentation?.slides[presentation.currentSlide];

  return (
    <div>
      <div
        className="indicator"
        style={{
          width: presentation
            ? `${
                (100 * presentation.currentSlide) /
                (presentation.slides.length - 1)
              }%`
            : 0,
        }}
      />
      <h2>{voteCode}</h2>

      <div className="voter-content-wrapper">
        <h1>{currentSlide?.value}</h1>

        <div className="likes">{currentSlide?.likes ?? 0}</div>
        <div className="like">
          <button
            type="button"
            onClick={() => clientRef.current?.like()}
            disabled={!currentSlide}
          >
            👍
          </button>
        </div>
      </div>

      <div className="vote-dev-box">
        <DevItem
          title={`Ping ${isReady ? '✅' : '🛑'}`}
          value={ping >= 0 ? `${ping} ms` : 'Measuring...'}
        />
        <DevItem title="User location" value={regionData.userLocation} />
        <DevItem
          title="Data center location"
          value={regionData.dataCenterLocation}
        />
      </div>
    </div>
  );
}

function DevItem(props: { title: string; value: string }) {
  return (
    <div className="dev-item">
      <span className="dev-title">{props.title}</span>
      <br />
      <span className="dev-data">{props.value}</span>
    </div>
  );
}

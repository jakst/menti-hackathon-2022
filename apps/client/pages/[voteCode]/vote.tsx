import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient, PaceState } from '../../src/createClient';
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
  const [pace, setPace] = useState<PaceState | null>(null);

  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  useEffect(() => {
    const client = createClient({
      voteCode,
      onConnect() {
        setIsConnected(true);
      },
      onDisconnect() {
        setIsConnected(false);
      },
      onPingPong(value) {
        setPing(value);
      },
      onPaceChange(value) {
        setPace(value);
      },
    });

    document.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowRight') client.nextSlide();
      if (event.code === 'ArrowLeft') client.previousSlide();
    });

    return () => {
      client?.close();
    };
  }, []);

  const isReady = isConnected && pace !== null;

  return (
    <div>
      <div
        className="indicator"
        style={{ width: `${(100 * (pace?.currentSlide ?? 0)) / 10}%` }}
      />
      <h1>{voteCode}</h1>

      {isReady && <div>Current slide: {pace.currentSlide}</div>}

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

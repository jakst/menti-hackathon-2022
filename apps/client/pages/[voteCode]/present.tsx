import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { createClient, PresentationState, Slide } from '../../src/createClient';
import { useRegionData } from '../../src/useRegionData';

export default function PresentPage() {
  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  if (!voteCode) return null;
  return <PageContents />;
}

function PageContents() {
  const regionData = useRegionData();

  const [showDev, setShowDev] = useState(true);
  const [ping, setPing] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [presentation, setPresentation] = useState<PresentationState | null>(
    null,
  );

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      console.log(event.code);
      if (event.code === 'KeyD') setShowDev((v) => !v);
    }

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const client = createClient({
      voteCode,
      onConnect(value) {
        setIsConnected(true);
        setPresentation(value);
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

    document.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowRight') client.nextSlide();
      if (event.code === 'ArrowLeft') client.previousSlide();
    });

    return () => {
      client.close();
    };
  }, []);

  const isReady = isConnected && presentation !== null;

  return (
    <div>
      <h2>{voteCode}</h2>

      {isReady && <div>Current slide: {presentation.currentSlide}</div>}

      <div style={{ display: 'flex' }}>
        {presentation && (
          <Form
            presentation={presentation}
            onSlidesChanged={clientRef.current?.updateSlides}
          />
        )}

        <h1 style={{ marginLeft: 60 }}>
          Voters: {presentation?.numberOfVoters ?? 0}
          <br />
          Likes: {presentation?.slides[presentation.currentSlide]?.likes ?? 0}
        </h1>
      </div>

      {showDev && (
        <div className="dev-box">
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
      )}
    </div>
  );
}

function Form(props: {
  presentation: PresentationState;
  onSlidesChanged?: (slides: Slide[]) => void;
}) {
  const [data, setData] = useState(props.presentation.slides);

  useEffect(() => {
    props.onSlidesChanged?.(data);
  }, [data]);

  return (
    <div className="value-form">
      {data.map((item, index) => (
        <div>
          <input
            key={item.id}
            defaultValue={item.value}
            onChange={(ev) => {
              setData(
                Object.assign([], data, {
                  [index]: { ...item, value: ev.currentTarget.value },
                }),
              );
            }}
          />
          <button
            type="button"
            onClick={() => setData(data.filter((v) => v !== item))}
          >
            Remove
          </button>
          {index === props.presentation.currentSlide && (
            <div
              style={{
                minWidth: 8,
                height: 8,
                backgroundColor: 'dodgerblue',
                borderRadius: '50%',
              }}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setData((v) => [
            ...v,
            { id: String(Math.random()).slice(2, 10), value: '', likes: 0 },
          ])
        }
      >
        Add
      </button>
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

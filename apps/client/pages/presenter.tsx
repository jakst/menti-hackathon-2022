import { useEffect, useState } from 'react';
import { createClient, PaceState } from '../src/createClient';

interface UserRegionData {
  city: string;
  country: string;
}

interface StorageRegionData {
  colo: string;
}

function useRegionData() {
  const [userRegionData, setUserRegionData] = useState<UserRegionData | null>(
    null,
  );
  const [storageRegionData, setStorageRegionData] =
    useState<StorageRegionData | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STORAGE_FETCH_URL}/user-region`)
      .then((res) => res.json())
      .then(setUserRegionData);
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STORAGE_FETCH_URL}/storage-region`)
      .then((res) => res.json())
      .then(setStorageRegionData);
  }, []);

  let userLocation = '...';
  let dataCenterLocation = '...';

  if (userRegionData) {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const country = regionNames.of(userRegionData.country);

    userLocation = `${userRegionData.city}, ${country}`;
  }

  if (storageRegionData) dataCenterLocation = storageRegionData.colo;

  return {
    userLocation,
    dataCenterLocation,
  };
}

export default function PresenterPage() {
  const regionData = useRegionData();

  const [showDev, setShowDev] = useState(true);
  const [ping, setPing] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [pace, setPace] = useState<PaceState | null>(null);

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      console.log(event.code);
      if (event.code === 'KeyD') setShowDev((v) => !v);
    }

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    const client = createClient({
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
      <div style={{ display: 'flex' }}>
        <span
          style={{
            alignSelf: 'center',
            backgroundColor: isReady ? 'green' : 'red',
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            marginLeft: 5,
            marginRight: 5,
          }}
        />
        <h1 style={{ margin: 5 }}>{isReady ? 'Connected' : 'Not connected'}</h1>
      </div>

      {isReady && <div>Current slide: {pace.currentSlide}</div>}

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
          <hr />
          <DevItem
            title="Acive slide index"
            value={isReady ? String(pace.currentSlide) : '...'}
          />
        </div>
      )}
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

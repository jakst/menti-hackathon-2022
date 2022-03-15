import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface UserRegionData {
  city: string;
  country: string;
}

interface StorageRegionData {
  colo: string;
}

export function useRegionData() {
  const router = useRouter();
  const voteCode = router.query['voteCode'] as string;

  console.log('hej', voteCode);

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
    fetch(
      `${process.env.NEXT_PUBLIC_STORAGE_FETCH_URL}/${voteCode}/storage-region`,
    )
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

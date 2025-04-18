export default function MeishiCard({ data }) {
  return (
    <div className="border shadow rounded-lg p-6 text-center">
      <img src={data.iconUrl || '/default-icon.png'} className="w-24 h-24 rounded-full mx-auto" />
      <h2 className="text-xl font-bold mt-4">{data.name}</h2>
      <p className="mt-2">棋力: {data.rank}</p>
      <p className="mt-1">棋風: {data.style}</p>
      <p className="mt-1">囲碁歴: {data.experience}</p>
      <p className="mt-1">推し棋士: {data.favoritePlayer}</p>
      <p className="mt-1">ひとこと: {data.message}</p>
    </div>
  );
}
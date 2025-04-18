import { useState } from 'react';
import { useRef } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from 'next/router';
import { db, auth } from "../../lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import Head from 'next/head';
import { QRCodeCanvas } from 'qrcode.react';

export default function MeishiPage({ meishi, uId }) {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const qrRef = useRef(null);

  if (loading) return null;

  const handleEditClick = () => {
    if (user) {
      router.push(`/edit/${user.uid}`);
    } else {
      router.push(`/login?redirect=/edit`);
    }
  }

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'igo-meishi-qrcode.png';
    link.click();
  };

  const handleTweet = () => {
  const text = `${meishi.name}さんの囲碁名刺です！\n`;
  const url = window.location.href;

  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    text
  )}&url=${encodeURIComponent(url)}`;

  window.open(tweetUrl, '_blank');
  };

  return (
    <>
      <Head>
        <title>{meishi.name}の 囲碁名刺</title>
      </Head>
      <div className="relative bg-[url('/images/igo.webp')] bg-cover bg-center bg-no-repeat min-h-screen flex justify-center">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-none z-0"></div>
      <div className="absolute top-4 right-4 text-sm text-gray-700">
      <a href="http://localhost:3000">トップページへ</a>
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto border p-6 rounded-lg shadow-lg mt-10 bg-white text-center">
      {/* アイコンと名前を横並びに */}
      <div className="flex items-center justify-center mb-6 space-x-4">
        {meishi.iconUrl && (
          <img
            src={meishi.iconUrl}
            className="w-24 h-24 rounded-full object-cover border"
            alt="Icon"
          />
        )}
      <h1 className="text-2xl font-extrabold text-gray-800 text-left">
        {meishi.name}
      </h1>
      </div>

    {/* 名刺情報 */}
      <div className="text-gray-600 font-semibold mb-1">Link</div>

      {meishi.youtubeurl && (
        <div className="text-red-600 font-semibold mb-1">
        <a href={meishi.youtubeurl} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-800">
        YouTube
        </a>
        </div>
      )}

      {meishi.twitterurl && (
        <div className="text-blue-600 font-semibold mb-1">
        <a href={meishi.twitterurl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
        X(Twitter)
        </a>
        </div>
      )}

      {meishi.instagramurl && (
        <div className="text-purple-600 font-semibold mb-1">
        <a href={meishi.instagramurl} target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">
        Instagram
        </a>
        </div>
      )}

    <div className="space-y-4 text-base text-gray-800">
      <div>
        <div className="text-gray-600 font-semibold mb-1">棋力</div>
        <div>{(Array.isArray(meishi.rank) ? meishi.rank : [meishi.rank]).join('、') || '―'}</div>
      </div>

      <div>
        <div className="text-gray-600 font-semibold mb-1">棋風</div>
        <div>{meishi.style || '―'}</div>
      </div>

      <div>
        <div className="text-gray-600 font-semibold mb-1">囲碁歴</div>
        <div>{meishi.experience || '―'}</div>
      </div>

      <div>
        <div className="text-gray-600 font-semibold mb-1">推し棋士</div>
        <div>{meishi.favoritePlayer || '―'}</div>
      </div>

      <div>
        <div className="text-gray-600 font-semibold mb-1">ひとこと</div>
        <div>{meishi.message || '―'}</div>
      </div>
    </div>

    {/* 日付 */}
    <div className="mt-6 text-xs text-gray-500">
      <p>作成日: {meishi.createdAt ? new Date(meishi.createdAt).toLocaleDateString() : '―'}</p>
      <p>最終更新日: {meishi.lastUpdated ? new Date(meishi.lastUpdated).toLocaleDateString() : '―'}</p>
    </div>

    {/* QRコード */}
    <div className="mt-4 flex items-center justify-center space-x-6">
  {/* 左側：QRコード＋説明＋保存 */}
  <div className="flex flex-col items-center space-y-1" ref={qrRef}>
    <QRCodeCanvas
      value={window.location.href}
      size={96}
      bgColor="#ffffff"
      fgColor="#000000"
      level="H"
    />
    <p className="text-[10px] text-gray-400">共有用URL</p>
    <button
      onClick={handleDownload}
      className="text-xs text-blue-500 hover:underline"
    >
      QRコードを保存
    </button>
  </div>

  {/* 右側：Twitterボタン */}
  <button
    onClick={handleTweet}
    className="text-white bg-blue-500 hover:bg-blue-600 text-xs px-3 py-2 rounded transition">
    X(Twitter)で共有
  </button>
  </div>

    </div>
    </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  // const [user] = useAuthState(auth);
  const docRef = doc(db, 'igo_meishi', params.uId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return { notFound: true };
  }

  const data = docSnap.data();

  return {
    props: {
      meishi: {
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        lastUpdated: data.lastUpdated?.toDate().toISOString() || null,
      },
      // docId: params.docId,
      uId: params.uId,
    },
  };
}
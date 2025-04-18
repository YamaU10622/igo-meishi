import { useRouter } from 'next/router';
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from 'react';
import { auth } from "../lib/firebase";
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from "framer-motion";
import Head from 'next/head';

export default function Home() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  // 表示用ステート
  const [showViewForm, setShowViewForm] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewError, setViewError] = useState('');
  const [createError, setCreateError] = useState('');

  if (loading) return null;

  // 表示検索
  const handleViewSearch = async () => {
    setViewError('');
    try {
      const q = query(collection(db, 'igo_meishi'), where('normalizedName', '==', viewName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setViewError('該当する名刺が見つかりません');
        return;
      }

      const doc = querySnapshot.docs[0];
      console.log(doc);
      console.log(doc.id);
      router.push(`/meishi/${doc.id}`);
    } catch (error) {
      console.error(error);
      setViewError('検索中にエラーが発生しました');
    }
  };

  const handleCreateClick = async () => {
    if (!user) {
      router.push("/login?redirect=/create");
      return;
    }

    setCreateError(''); 

    try {
      const q = query(collection(db, 'igo_meishi'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setCreateError('すでに作成済みです');
        return;
      }

      // 存在しなければ作成ページへ
      router.push("/create");
    } catch (err) {
      console.error(err);
      setCreateError('作成中にエラーが発生しました');
    }
  };



  const handleLoginClick = () => {
    if (!user) {
      router.push("/login?redirect=/");
    }
  };

  const handleEditClick = () => {
    if (user) {
      router.push(`/edit/${user.uid}`);
    } else {
      router.push(`/login?redirect=/edit`);
    }
  }


  return (
    <>
      <Head>
        <title>囲碁名刺サイト</title>
      </Head>

      <div className="relative min-h-screen bg-[url('/images/igo.webp')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-white/60"></div>

      <div className="absolute top-4 right-4 text-sm text-gray-700">
        {user ? (
          <div className="flex items-center gap-2">
            <span>{user.displayName} でログイン中</span>
            <button onClick={() => auth.signOut()} className="text-blue-600 hover:underline">
              ログアウト
            </button>
          </div>
        ) : (
          <button onClick={handleLoginClick} className="text-black hover:text-gray-400">
            Googleでログイン
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl font-bold mb-6 text-gray-800"
        >
          囲碁名刺サイト
        </motion.h1>
        <p className="text-center max-w-md mb-8 text-gray-600">
          囲碁が好きな人のための囲碁名刺を作成・共有できるサイトです！
          棋力や好きな棋士、棋風などを自由に記載して、あなたの囲碁スタイルを発信しましょう！
        </p>

        <div className="space-y-4 w-full max-w-xs">
          {/* 作成 */}
          <button onClick={handleCreateClick}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-400"
          >
            作成
          </button>

          {createError && (
            <p className="text-sm text-red-500 text-center">{createError}</p>
          )}

          {/* 編集 */}
          <div className="w-full">
            <button onClick={handleEditClick} 
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-400"
            >
              編集
            </button>

            {/* {showEditForm && (
              <div className="mt-4 bg-white p-4 rounded shadow space-y-3">
                <input
                  type="text"
                  placeholder="氏名またはハンドルネーム"
                  className="w-full border px-3 py-2 rounded"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  className="w-full border px-3 py-2 rounded"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <button
                  onClick={handleEditAuth}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  認証して編集へ
                </button>
                {editError && <p className="text-red-500 text-sm">{editError}</p>}
              </div>
            )} */}
          </div>

          {/* 表示 */}
          <div className="w-full">
            <button
              onClick={() => {
                setShowViewForm(!showViewForm);
                // setShowEditForm(false);
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-400"
            >
              表示
            </button>

            {showViewForm && (
              <div className="mt-4 bg-white px-4 py-2 rounded shadow space-y-3">
                <input
                  type="text"
                  placeholder="氏名またはハンドルネーム"
                  className="w-full border px-3 py-2 rounded"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                />
                <button
                  onClick={handleViewSearch}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-400"
                >
                  名刺を表示
                </button>
                {viewError && <p className="text-red-500 text-sm">{viewError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
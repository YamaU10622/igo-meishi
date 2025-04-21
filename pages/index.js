import { useRouter } from 'next/router';
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from 'react';
import { auth } from "../lib/firebase";
import { db } from '../lib/firebase';
import { doc, query, where, getDoc, getDocs, collection } from 'firebase/firestore';
import { motion } from "framer-motion";
import Head from 'next/head';
import Footer from '@/components/Footer';

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [showViewForm, setShowViewForm] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewError, setViewError] = useState('');
  const [createError, setCreateError] = useState('');

  if (loading) return null;

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

  const handleEditClick = async () => {
    if (user) {
      try {
        const docRef = doc(db, 'igo_meishi', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const normalizedName = userData.normalizedName;
          router.push(`/edit/${encodeURIComponent(normalizedName)}`);
        } else {
          router.push(`/login?redirect=/create`);
        }
      } catch (error) {
        console.error("ユーザーデータ取得中にエラー:", error);
        router.push(`/login?redirect=/`);
      }
    } else {
      router.push(`/login?redirect=/`);
    }
  };

  // ユーザー検索
  const handleViewSearch = async () => {
    try {
      const q = query(collection(db, 'igo_meishi'), where('normalizedName', '==', viewName));
      const querySnap = await getDocs(q);

      setViewError('');
      if (querySnap.empty) {
        setViewError('該当する名刺が見つかりません');
        return;
      }

      const docSnap = querySnap.docs[0];
      const userData = docSnap.data();
      const normalizedName = userData.normalizedName;
      router.push(`/meishi/${encodeURIComponent(normalizedName)}`);
      } catch (error) {
      console.error(error);
      setViewError('検索中にエラーが発生しました');
    }
  };

  return (
    <>
      <Head>
        <title>囲碁名刺サイト</title>
      </Head>
      <div className="relative min-h-screen flex flex-col">
      <div className="absolute inset-0 -z-10 min-h-screen bg-[url('/images/igo.webp')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center px-4"></div>
      <div className="absolute inset-0 -z-10 bg-white/60"></div>

      <div className="top-0 right-0 m-4">
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
        <p className="text-center max-w-xl mb-8 text-gray-600">
          囲碁好きのための「囲碁名刺」作成＆共有サイトです！
          <br /><br /> 棋力や推し棋士、棋風などを自由に記載して、あなたの囲碁スタイルを発信しましょう。
          <br /><br /> 「作成する」ボタンから名刺の登録（Googleログイン＆ユーザー名必須）
          <br /><br /> 「編集する」から名刺の修正、「ユーザー名で検索」から自分や他のユーザーの名刺の表示ができます。
          <br /><br /> ※今後、ユーザーリストや棋力による検索機能も追加予定。
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
          </div>

          {/* 表示 */}
          <div className="w-full">
            <button
              onClick={() => {
                setShowViewForm(!showViewForm);
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-400"
            >
              ユーザー名で検索
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
      <Footer />
      </div>
    </>
  );
}
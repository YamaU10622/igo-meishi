import { useState,useEffect } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from 'next/router';
import { doc, collection, query, where, getDoc,getDocs , updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../lib/firebase';

const platforms = ['幽玄の間', '野狐囲碁', '東洋囲碁', 'OGS','KGS', 'みんなの囲碁', 'その他(自由入力)'

];
const ranks = [
  '9段', '8段', '7段', '6段', '5段', '4段', '3段', '2段', '初段',
  ...Array.from({ length: 30 }, (_, i) => `${i + 1}級`),
  'その他(自由入力)'
];

// 編集画面で表示する棋力の選択肢（登録時に保存された形式と一致させるため）
const rankOptions = [];

platforms.forEach(platform => {
  if (platform === 'その他(自由入力)') return; // 除外
  ranks.forEach(rank => {
    rankOptions.push(`${platform}${rank}`);
  });
});

rankOptions.push('その他(自由入力)'); // 自由入力用

export default function EditPage({ meishi, uId }) {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [name, setName] = useState(meishi.name || '');
  const [youtubeurl, setYURL] = useState(meishi.youtubeurl || '');
  const [twitterurl, setTURL] = useState(meishi.twitterurl || '');
  const [instagramurl, setIURL] = useState(meishi.instagramurl || '');
  const [ranksList, setRanksList] = useState([]);

  // useEffect(() => {
  //   if (meishi.rank && meishi.rank.length > 0) {
  //     const parsed = meishi.rank.map(r => {
  //       const match = r.match(/^(.+?)([\d,]+[段級])$/);
  //       if (match) {
  //         return { platform: match[1], rank: match[2], customPlatform: '', customRank: '' };
  //       } else {
  //         // 自由入力扱い
  //         return {
  //           platform: 'その他(自由入力)',
  //           rank: 'その他(自由入力)',
  //           customPlatform: r.includes('段') || r.includes('級') ? r.replace(/[段級].*$/, '') : r,
  //           customRank: r.match(/\d+[段級]/) ? r.match(/\d+[段級]/)[0] : ''
  //         };
  //       }
  //     });
  //     console.log('Parsed ranks:', parsed);
  //     setRanksList(parsed);
  //   }
  // }, [meishi.rank]);

  const [style, setStyle] = useState(meishi.style || '');
  const [experienceYear, setexperienceYear] = useState(meishi.experience?.match(/(\d+)年/)?.[1] || '');
  const [experienceMonth, setExperienceMonth] = useState(meishi.experience?.match(/(\d+)ヶ月/)?.[1] || '');
  const [favoritePlayer, setFavoritePlayer] = useState(meishi.favoritePlayer || '');
  const [message, setMessage] = useState(meishi.message || '');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(meishi.iconUrl || null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleRankChange = (index, key, value) => {
    const updated = [...ranksList];
    updated[index][key] = value;
    setRanksList(updated);
  };
  
  const addRankField = () => {
    if (ranksList.length >= 3) return;
    setRanksList([...ranksList, { platform: '', customPlatform: '', rank: '', customRank: '' }]);
  };

  const removeRankField = (index) => {
    setRanksList(prev => prev.filter((_, i) => i !== index));
  };

  const normalizeName = (name) => {
    return name.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  };

  const validateForm = async() => {
    const errors = {};
    if (!name.trim()) errors.name = '氏名orハンドルネームは必須です';
    if (experienceYear && !/^\d+$/.test(experienceYear)) errors.experience = '年数は整数で入力して下さい';
    if (experienceMonth && !/^\d+$/.test(experienceMonth)) errors.experience = '月数は整数で入力して下さい';

    const nameQuery = query(
      collection(db, 'igo_meishi'),
      where('normalizedName', '==', normalizeName(name))
    );
    const nameQuerySnapshot = await getDocs(nameQuery);

    if (!nameQuerySnapshot.empty) {
      const isOwnDoc = nameQuerySnapshot.docs.some(doc => doc.data().uid === user.uid);

      if (!isOwnDoc) {
        errors.name = 'この氏名またはユーザー名は既に登録されています。変更してください。';
      } 
    }

    return errors;
  };

  // // useEffectなどでFirestoreから取得したデータを使う場合は以下のように整形
  // const normalizeRanksList = (originalList) => {
  //   return originalList.map((item) => {
  //     return {
  //       platform: item.customPlatform ? 'その他(自由入力)' : item.platform || '',
  //       customPlatform: item.customPlatform || '',
  //       rank: item.customRank ? 'その他(自由入力)' : item.rank || '',
  //       customRank: item.customRank || ''
  //     };
  //   });
  // };

  // // 初期化時などで呼び出す（例）
  // useEffect(() => {
  //   if (meishi && meishi.rankList) {
  //     setRanksList(normalizeRanksList(meishi.rankList));
  //   }
  // }, [meishi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = await validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setIsSubmitting(true);
    setError('');
    setValidationErrors({});

    try {
      let iconUrl = meishi.iconUrl;
      if (iconFile) {
        const storageRef = ref(storage, `icons/${Date.now()}_${iconFile.name}`);
        await uploadBytes(storageRef, iconFile);
        iconUrl = await getDownloadURL(storageRef);
      }

      let experience = '';
      if (experienceYear && experienceMonth) experience = `${experienceYear}年${experienceMonth}ヶ月`;
      else if (experienceYear) experience = `${experienceYear}年`;
      else if (experienceMonth) experience = `${experienceMonth}ヶ月`;

      
      const finalRanks = ranksList.map(r => {
        const platform = r.platform === 'その他(自由入力)' ? r.customPlatform : r.platform;
        const rank = r.rank === 'その他(自由入力)' ? r.customRank : r.rank;
        return platform && rank ? `${platform}${rank}` : null;
      }).filter(Boolean);

      // const cleanedRankList = ranksList.map((item) => ({
      //   platform: item.platform === 'その他(自由入力)' ? 'その他(自由入力)' : item.platform,
      //   customPlatform: item.platform === 'その他(自由入力)' ? item.customPlatform : '',
      //   rank: item.rank === 'その他(自由入力)' ? 'その他(自由入力)' : item.rank,
      //   customRank: item.rank === 'その他(自由入力)' ? item.customRank : ''
      // }));

      await updateDoc(doc(db, 'igo_meishi', uId), {
        name,
        normalizedName: normalizeName(name),
        rank: finalRanks,
        style,
        experience,
        favoritePlayer,
        message,
        iconUrl,
        lastUpdated: serverTimestamp(),
      });

      router.push(`/meishi/${uId}`);
    } catch (err) {
      console.error('更新エラー:', err);
      setError('更新中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className ="min-h-screen bg-cover bg-center" style={{ backgroundImage: 'var(--black)' }}>
    <div className="container mx-auto p-8 bg-white bg-opacity-80 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-4">囲碁名刺を編集</h1>
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-4">
        <div>
          <label className="block font-bold">(入力必須) 氏名 or ハンドルネーム）
          <input 
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)
            }
            className="w-full border p-2 rounded-lg" required />
          </label>
          {validationErrors.name && <p className="text-red-500">{validationErrors.name}</p>}
        </div>

        <div>
          <label className="block font-bold">
            Youtube URL
          <input
            type="text"
            maxLength={100}
            placeholder="https://www.youtube.com/@yourchannel"
            value={youtubeurl}
            onChange={(e) => setYURL(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">
            X(Twitter) URL
          <input
            type="text"
            maxLength={50}
            placeholder="https://x.com/yourid"
            value={twitterurl}
            onChange={(e) => setTURL(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">
            Instagram URL
          <input
            type="text"
            maxLength={100}
            placeholder="https://www.instagram.com/yourid/"
            value={instagramurl}
            onChange={(e) => setIURL(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">棋力（最大3件）</label>
          ※選択肢にない場合は「その他(自由入力)」を選択して入力してください（30字以内）
          {ranksList.map((rank, index) => (
          <div key={index} className="mb-2 space-x-2">
            <select
              value={rank.platform}
              onChange={(e) => handleRankChange(index, 'platform', e.target.value)}
              className="border p-1 rounded-lg"
            >
              <option value="">プラットフォーム</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {rank.platform === 'その他(自由入力)' && (
              <input
                type="text"
                maxLength={30}
                placeholder="プラットフォームなど"
                value={rank.customPlatform}
                onChange={(e) => handleRankChange(index, 'customPlatform', e.target.value)}
                className="border p-1 rounded-lg"
              />
            )}
            <select
              value={rank.rank}
              onChange={(e) => handleRankChange(index, 'rank', e.target.value)}
              className="border p-1 rounded-lg"
            >
              <option value="">段位/級位</option>
              {ranks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {rank.rank === 'その他(自由入力)' && (
              <input
                type="text"
                maxLength={30}
                placeholder="段位/級位など"
                value={rank.customRank}
                onChange={(e) => handleRankChange(index, 'customRank', e.target.value)}
                className="border p-1 rounded-lg"
              />
            )}
        </div>
        ))}
        {ranksList.length < 3 && (
          <button type="button" onClick={addRankField} className="border p-1 underline">
            ＋追加
          </button>
        )}
        {ranksList.length > 1 && (
          <button type="button" onClick={() => removeRankField(ranksList.length-1)}
          className="border p-1 underline">
            －削除
          </button>
        )}
      </div>

        <div>
          <label className="block font-bold">
            棋風（50字以内）
          <input
            type="text"
            maxLength={50}
            placeholder="例：実利派、厚み派等"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">囲碁歴（半角数字、一方が空欄でもOKです）</label>
          <div className="flex space-x-2 items-center">
            <input
              type="number"
              value={experienceYear}
              onChange={(e) => setexperienceYear(e.target.value)}
              placeholder="年"
              className="w-20 border p-1 rounded-lg"
              min="0"
            />
            <span>年</span>
            <input
              type="number"
              value={experienceMonth}
              onChange={(e) => setExperienceMonth(e.target.value)}
              placeholder="月"
              className="w-20 border p-1 rounded-lg"
              min="0"
              max="11"
            />
            <span>ヶ月</span>
          </div>
          {validationErrors.experience && <p className="text-red-500">{validationErrors.experience}</p>}
        </div>

        <div>
          <label className="block font-bold">
            推し棋士（あれば推す理由なども）（100字以内）
          <input
            type="text"
            maxLength={100}
            value={favoritePlayer}
            onChange={(e) => setFavoritePlayer(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">
            ひとこと（100字以内）
          <input
            type="text"
            maxLength={100}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
        </div>

        <div>
          <label className="block font-bold">
            アイコン画像（再設定可能）（5MB以下）
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError('jpg または png ファイルを選択してください');
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                setError('5MB以下の画像を選択してください');
                return;
              }
              setIconFile(file);
              setIconPreview(URL.createObjectURL(file));
            }}
          />
          </label>
          {iconPreview && <img src={iconPreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full" />}
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
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
      uId: params.uId,
    },
  };
}
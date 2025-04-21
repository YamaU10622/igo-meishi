import { useState } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from 'next/router';
import { doc, collection, query, where, getDoc,getDocs , updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../lib/firebase';

const platforms = [
  '幽玄の間 ', '野狐囲碁 ', '東洋囲碁 ', 'OGS ', 'KGS ', '囲碁クエスト(9路) ', '囲碁クエスト(13路) ', '囲碁クエスト(19路) ', 'みんなの囲碁 ', 'その他(自由入力)'
];
const ranks = [
  '9段', '8段', '7段', '6段', '5段', '4段', '3段', '2段', '初段',
  ...Array.from({ length: 30 }, (_, i) => `${i + 1}級`),
  'その他(自由入力)'
];

// 編集画面で表示する棋力の選択肢（登録時に保存された形式と一致させるため）
const rankOptions = [];

platforms.forEach(platform => {
  if (platform === 'その他(自由入力)') return;
  ranks.forEach(rank => {
    rankOptions.push(`${platform}${rank}`);
  });
});

rankOptions.push('その他(自由入力)'); 

export default function EditPage({ meishi, uid }) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [name, setName] = useState(meishi.name || '');
  const [youtubeurl, setYURL] = useState(meishi.youtubeurl || '');
  const [twitterurl, setTURL] = useState(meishi.twitterurl || '');
  const [instagramurl, setIURL] = useState(meishi.instagramurl || '');
  const [ranksList, setRanksList] = useState(meishi.rank || '');
  const [style, setStyle] = useState(meishi.style || '');
  const [experienceYear, setexperienceYear] = useState(meishi.experienceYear || '');
  const [experienceMonth, setExperienceMonth] = useState(meishi.experienceMonth || '');
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
    if (ranksList.length >= 4) return;
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

    const youtubeUrlPattern = /^https:\/\/youtube\.com\//;
    const trimmedyoutubeUrl = youtubeurl.trim();
    if (trimmedyoutubeUrl && !trimmedyoutubeUrl.match(youtubeUrlPattern)) {
      errors.youtubeurl = "https://youtube.com/ を含めたURLを入力してください";
    }

    const twitterUrlPattern = /^https:\/\/x\.com\//;
    const trimmedtwitterUrl = twitterurl.trim();
    if (trimmedtwitterUrl && !trimmedtwitterUrl.match(twitterUrlPattern)) {
      errors.twitterurl = "https://x.com/ を含めたURLを入力してください";
    }

    const instagramUrlPattern = /^https:\/\/instagram\.com\//;
    const trimmedinstagramUrl = instagramurl.trim();
    if (trimmedinstagramUrl && !trimmedinstagramUrl.match(instagramUrlPattern)) {
      errors.instagramurl = "https://instagram.com/ を含めたURLを入力してください";
    }

    if (experienceYear && !/^\d+$/.test(experienceYear)) errors.experienceYear = '年数は整数で入力して下さい';
    if (experienceMonth && !/^\d+$/.test(experienceMonth)) errors.experienceMonth = '月数は整数で入力して下さい';

    const nameQuery = query(
      collection(db, 'igo_meishi'),
      where('normalizedName', '==', normalizeName(name))
    );
    const nameQuerySnapshot = await getDocs(nameQuery);

    if (!nameQuerySnapshot.empty) {
      const isOwnDoc = nameQuerySnapshot.docs.some(doc => doc.id === user.uid);

      if (!isOwnDoc) {
        errors.name = 'この氏名またはユーザー名は既に登録されています。変更してください。';
      } 
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = await validateForm();
    console.log("errors;",errors);
    if (Object.keys(errors).length > 0) {
      console.log("errors:",errors);
      setValidationErrors(errors);
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      let iconUrl = meishi.iconUrl;
      if (iconFile) {
        const storageRef = ref(storage, `icons/${Date.now()}_${iconFile.name}`);
        await uploadBytes(storageRef, iconFile);
        iconUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'igo_meishi', user.uid), {
        name,
        youtubeurl,
        twitterurl,
        instagramurl,
        normalizedName: normalizeName(name),
        rank: ranksList,
        style,
        experienceYear,
        experienceMonth,
        favoritePlayer,
        message,
        iconUrl,
        lastUpdated: serverTimestamp(),
      });

      router.push(`/meishi/${encodeURIComponent(name)}`);
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
          <div className="mt-2 text-sm text-gray-500">
            {name.length} / 20 字
          </div>
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
          {validationErrors.youtubeurl && <p className="text-red-500">{validationErrors.youtubeurl}</p>}
        </div>

        <div>
          <label className="block font-bold">
            X(Twitter) URL
          <input
            type="text"
            maxLength={100}
            placeholder="https://x.com/yourid"
            value={twitterurl}
            onChange={(e) => setTURL(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          </label>
          {validationErrors.twitterurl && <p className="text-red-500">{validationErrors.twitterurl}</p>}
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
          {validationErrors.instagramurl && <p className="text-red-500">{validationErrors.instagramurl}</p>}
        </div>

        <div>
          <label className="block font-bold">棋力（4つまで）</label>
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
                placeholder=""
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
                placeholder=""
                value={rank.customRank}
                onChange={(e) => handleRankChange(index, 'customRank', e.target.value)}
                className="border p-1 rounded-lg"
              />
            )}
        </div>
        ))}
        {ranksList.length < 4 && (
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
          <div className="mt-2 text-sm text-gray-500">
            {style.length} / 50 字
          </div>
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
          {validationErrors.experienceYear && <p className="text-red-500">{validationErrors.experienceYear}</p>}
          {validationErrors.experienceMonth && <p className="text-red-500">{validationErrors.experienceMonth}</p>}
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
          <div className="mt-2 text-sm text-gray-500">
            {favoritePlayer.length} / 100 字
          </div>
        </div>

        <div>
          <label className="block font-bold">
            ひとこと・宣伝など（100字以内）
          <input
            type="text"
            maxLength={100}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
          <div className="mt-2 text-sm text-gray-500">
            {message.length} / 100 字
          </div>
          </label>
        </div>

        <div>
          <label className="block font-bold">
            アイコン画像（再設定可能）（jpgまたはpng、5MB以下）
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
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded block mx-auto"
          disabled={isSubmitting}
          >
          {isSubmitting ? '保存中...' : '保存する'}
          </button>
          {Object.keys(validationErrors).length > 0 && (
            <p className="text-sm text-red-500 text-center">修正が必要です</p>
          )}
      </form>
    </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const nameQuery = query(
    collection(db, 'igo_meishi'),
    where('normalizedName', '==', params.normalizedName)
  );
  const querySnap = await getDocs(nameQuery);

  if (querySnap.empty) {
    return { notFound: true };
  }

  const docSnap = querySnap.docs[0];
  const data = docSnap.data();

  return {
    props: {
      meishi: {
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        lastUpdated: data.lastUpdated?.toDate().toISOString() || null,
      },
      normalizedName: params.normalizedName,
    },
  };
}
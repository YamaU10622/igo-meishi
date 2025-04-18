import { useState } from 'react';
import { useRouter } from 'next/router';
import { db, storage } from '../lib/firebase';
import { collection, setDoc, getDocs, serverTimestamp, query, where, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const platforms = [
  '幽玄の間', '野狐囲碁', '東洋囲碁', 'OGS', 'KGS', 'みんなの囲碁', 'その他(自由入力)'
];

const ranks = [
  '9段', '8段', '7段', '6段', '5段', '4段', '3段', '2段', '初段',
  ...Array.from({ length: 30 }, (_, i) => `${i + 1}級`),
  'その他(自由入力)'
];

export default function MeishiForm({ user }) {
  const router = useRouter();
  const uid = user?.uid;
  const [name, setName] = useState('');
  const [youtubeurl, setYURL] = useState('');
  const [twitterurl, setTURL] = useState('');
  const [instagramurl, setIURL] = useState('');
  const [ranksList, setRanksList] = useState([
    { platform: '', customPlatform: '', rank: '', customRank: '' }
  ]);
  const [styles, setStyle] = useState('');
  const [experienceYear, setExperienceYear] = useState('');
  const [experienceMonth, setExperienceMonth] = useState('');
  const [favoritePlayer, setFavoritePlayer] = useState('');
  const [message, setMessage] = useState('');
  // const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
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


  const validateForm = async () => {
    const errors = {};
    if (!name.trim()) errors.name = '氏名orハンドルネームは必須です';
    // if (!password.trim()) errors.password = '編集用パスワードは必須です';
    // if (!confirmPassword.trim()) errors.confirmPassword = '編集用パスワード（確認）は必須です';
    if (experienceYear && !/^\d+$/.test(experienceYear)) errors.experience = '年数は整数で入力して下さい';
    if (experienceMonth && !/^\d+$/.test(experienceMonth)) errors.experience = '月数は整数で入力して下さい';
    
    const nameQuery = query(
      collection(db, 'igo_meishi'),
      where('normalizedName', '==', normalizeName(name))
    );
    const nameQuerySnapshot = await getDocs(nameQuery);

    if (!nameQuerySnapshot.empty) {
      errors.name = 'この氏名orユーザー名は既に登録されています。変更してください。';
    }
    return errors;
  };

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
      let iconUrl = null;
      console.log('iconFile:', iconFile);
      if (iconFile) {
        const storageRef = ref(storage, `icons/${Date.now()}_${iconFile.name}`);
        try {
          await uploadBytes(storageRef, iconFile);
          iconUrl = await getDownloadURL(storageRef);
          console.log('iconUrl:', iconUrl);
        } catch (uploadError) {
          console.error('画像のアップロードに失敗:', uploadError);
        } 
      }
      // const passwordHash = bcrypt.hashSync(password, 10);
      const now = serverTimestamp();

      const finalRanks = ranksList.map(r => {
      const platform = r.platform === 'その他(自由入力)' ? r.customPlatform : r.platform;
      const rank = r.rank === 'その他(自由入力)' ? r.customRank : r.rank;
      return `${platform || ''}${rank || ''}`;
      }).filter(r => r); // 空文字は除外

      const experienceStr = [
      experienceYear && experienceYear !== '0' ? `${experienceYear}年` : '',
      experienceMonth && experienceMonth !== '0' ? `${experienceMonth}ヶ月` : ''
      ].join('');


      const docRef = await setDoc(doc(db, 'igo_meishi', user.uid), {
        uid,
        name,
        twitterurl,
        youtubeurl,
        instagramurl,
        normalizedName: normalizeName(name),
        rank: finalRanks,
        style: styles,
        experience: experienceStr,
        favoritePlayer,
        message,
        // passwordHash,
        createdAt: now,
        lastUpdated: now,
        iconUrl,
      });

    router.push(`/meishi/${user.uid}`);
    } catch (err) {
      console.error(err);
      setError('登録中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-4">
      <div>
        <label className="block font-bold">
          (入力必須) 氏名 or ハンドルネーム
          <input
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => 
              setName(e.target.value)
              }
            className="w-full border p-2 rounded-lg"
          />
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
        <label className="block font-bold">棋力（最大3つまで）</label>
        ※選択肢にない場合は「その他(自由入力)」（30字以内）を選択して入力してください
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
            value={styles}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full border p-2 rounded-lg"
          />
        </label>
      </div>

      <div>
        <label className="block font-bold">囲碁歴（半角数字、一方が空欄でもOKです）</label>
        <div className="flex space-x-2 items-center">
          <input
            type="text"
            value={experienceYear}
            onChange={(e) => setExperienceYear(e.target.value)}
            placeholder="年"
            className="w-20 border p-1 rounded-lg"
          />
          <span>年</span>
          <input
            type="text"
            value={experienceMonth}
            onChange={(e) => setExperienceMonth(e.target.value)}
            placeholder="月"
            className="w-20 border p-1 rounded-lg"
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
          アイコン画像をアップロードしてください　（5MB以下）
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => {
              const iconFile = e.target.files[0];
              if (!iconFile) return;
              if (!['image/jpeg', 'image/png'].includes(iconFile.type)) {
                setError('jpg または png ファイルを選択してください');
                return;
              }
              if (iconFile) {
                if (iconFile.size > 5 * 1024 * 1024) {
                setError('5MB以下の画像を選択してください');
                return;
                }
                setIconFile(iconFile);
                setIconPreview(URL.createObjectURL(iconFile));
                  }
            }}
          />
        </label>
        {iconPreview && <img src={iconPreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full" />}
      </div>

      {error && <p className="text-red-500">{error}</p>}

      <div className="text-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          {isSubmitting ? '登録中...' : '登録'}
        </button>
        {Object.keys(validationErrors).length > 0 && (
          <p className="text-sm text-red-500">修正が必要です</p>
        )}
      </div>
    </form>
  );
}
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useSetting } from '../lib/settings';
import { useToast } from './ui/Toast';

interface AccountProfile {
  email: string;
  phone: string;
  birthday: string; // YYYY-MM-DD
  emergencyName: string;
  emergencyPhone: string;
  notifyOnPublish: boolean;
  notifyOnReminder: boolean;
  notifyOnChange: boolean;
  monthlyHourLimit: number; // 0 = 上限なし
  retireDate: string; // YYYY-MM-DD or ""
}

const DEFAULT_PROFILE: AccountProfile = {
  email: '',
  phone: '',
  birthday: '',
  emergencyName: '',
  emergencyPhone: '',
  notifyOnPublish: true,
  notifyOnReminder: true,
  notifyOnChange: true,
  monthlyHourLimit: 0,
  retireDate: '',
};

function accountKey(meId: number | string): string {
  return `akiyume-account:${meId}`;
}

/** スタッフ・店長共用のアカウント設定フォーム。役割／所属店舗／雇用形態は表示専用。 */
export function AccountSettingsForm() {
  const { me, stores, storeId } = useApp();
  const { showToast } = useToast();
  const [profile, setProfile] = useSetting<AccountProfile>(
    accountKey(me?.id ?? 'guest'),
    DEFAULT_PROFILE,
  );
  const merged: AccountProfile = { ...DEFAULT_PROFILE, ...profile };
  const [draft, setDraft] = useState<AccountProfile>(merged);

  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwNew2, setPwNew2] = useState('');

  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗';
  const roleLabel = me?.role === 'MANAGER' ? '店長' : 'スタッフ';

  function update<K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function saveProfile() {
    setProfile(draft);
    showToast('アカウント情報を保存しました');
  }

  function changePassword() {
    if (!pwOld || !pwNew || !pwNew2) {
      showToast('すべての項目を入力してください');
      return;
    }
    if (pwNew !== pwNew2) {
      showToast('新しいパスワードが一致しません');
      return;
    }
    if (pwNew.length < 8) {
      showToast('新しいパスワードは8文字以上にしてください');
      return;
    }
    // デモなので実際の更新は行わず、UIだけ完結
    setPwOld(''); setPwNew(''); setPwNew2('');
    showToast('パスワードを更新しました（デモ）');
  }

  return (
    <div className="rk-account">
      <section className="rk-account__group">
        <h4>基本情報（変更不可）</h4>
        <dl className="rk-account__readonly">
          <dt>氏名</dt><dd>{me?.name}</dd>
          <dt>権限</dt><dd>{roleLabel}</dd>
          <dt>所属店舗</dt><dd>{storeName}</dd>
        </dl>
        <p className="rk-account__hint">
          氏名・権限・所属店舗・雇用形態の変更は、店長（または本部管理者）にお問い合わせください。
        </p>
      </section>

      <section className="rk-account__group">
        <h4>連絡先・プロフィール</h4>
        <label className="rk-account__row">
          <span>メールアドレス</span>
          <input
            type="email"
            value={draft.email}
            placeholder="taro@example.com"
            onChange={(e) => update('email', e.target.value)}
          />
        </label>
        <label className="rk-account__row">
          <span>携帯電話番号</span>
          <input
            type="tel"
            value={draft.phone}
            placeholder="090-1234-5678"
            onChange={(e) => update('phone', e.target.value)}
          />
        </label>
        <label className="rk-account__row">
          <span>生年月日</span>
          <input
            type="date"
            value={draft.birthday}
            onChange={(e) => update('birthday', e.target.value)}
          />
        </label>
      </section>

      <section className="rk-account__group">
        <h4>緊急連絡先</h4>
        <label className="rk-account__row">
          <span>氏名</span>
          <input
            type="text"
            value={draft.emergencyName}
            placeholder="例：山田 花子（妻）"
            onChange={(e) => update('emergencyName', e.target.value)}
          />
        </label>
        <label className="rk-account__row">
          <span>電話番号</span>
          <input
            type="tel"
            value={draft.emergencyPhone}
            placeholder="090-9876-5432"
            onChange={(e) => update('emergencyPhone', e.target.value)}
          />
        </label>
      </section>

      <section className="rk-account__group">
        <h4>通知の受け取り</h4>
        <label className="rk-account__check">
          <input type="checkbox" checked={draft.notifyOnPublish}
            onChange={(e) => update('notifyOnPublish', e.target.checked)} />
          シフト公開時に通知を受け取る
        </label>
        <label className="rk-account__check">
          <input type="checkbox" checked={draft.notifyOnReminder}
            onChange={(e) => update('notifyOnReminder', e.target.checked)} />
          提出期限のリマインドを受け取る
        </label>
        <label className="rk-account__check">
          <input type="checkbox" checked={draft.notifyOnChange}
            onChange={(e) => update('notifyOnChange', e.target.checked)} />
          公開済みシフトの変更通知を受け取る
        </label>
      </section>

      <section className="rk-account__group">
        <h4>勤務希望（自己申告）</h4>
        <label className="rk-account__row">
          <span>月間勤務時間の上限</span>
          <select
            value={draft.monthlyHourLimit}
            onChange={(e) => update('monthlyHourLimit', Number(e.target.value))}
          >
            <option value={0}>上限なし</option>
            <option value={88}>88時間（社会保険未加入の目安）</option>
            <option value={104}>104時間</option>
            <option value={120}>120時間</option>
            <option value={160}>160時間（フルタイム目安）</option>
          </select>
        </label>
        <label className="rk-account__row">
          <span>退職予定日</span>
          <input
            type="date"
            value={draft.retireDate}
            onChange={(e) => update('retireDate', e.target.value)}
          />
        </label>
        <p className="rk-account__hint">
          上限と退職予定日は、店長がシフトを組む際の目安として使用されます。
        </p>
      </section>

      <div className="rk-account__actions">
        <button type="button" className="btn btn-primary" onClick={saveProfile}>
          アカウント情報を保存
        </button>
      </div>

      <section className="rk-account__group rk-account__group--pw">
        <h4>パスワード変更</h4>
        <label className="rk-account__row">
          <span>現在のパスワード</span>
          <input type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} />
        </label>
        <label className="rk-account__row">
          <span>新しいパスワード</span>
          <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
        </label>
        <label className="rk-account__row">
          <span>新しいパスワード（確認）</span>
          <input type="password" value={pwNew2} onChange={(e) => setPwNew2(e.target.value)} />
        </label>
        <div className="rk-account__actions">
          <button type="button" className="btn btn-soft" onClick={changePassword}>
            パスワードを変更
          </button>
        </div>
        <p className="rk-account__hint">
          8文字以上にしてください。デモではバックエンドへ反映されません。
        </p>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { useSetting } from '../../lib/settings';
import { useToast } from '../ui/Toast';

type Tab = 'rank' | 'skill';

/** ランク階層（参考UI初期値 S・A・B・C・D）。staff.rank の数値にマップする。 */
const RANK_TIERS: { name: string; value: number }[] = [
  { name: 'S', value: 5 },
  { name: 'A', value: 4 },
  { name: 'B', value: 3 },
  { name: 'C', value: 2 },
  { name: 'D', value: 1 },
];

/** ランク・スキル一覧（画像準拠）。タブで切り替え、行ごとに保有者を追加/削除する。 */
export function RankSkillScreen({ initialTab }: { initialTab: Tab }) {
  const { staff, updateStaff, storeId } = useApp();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillDefs, setSkillDefs] = useSetting<string[]>(`akiyume-skill-defs:${storeId}`, []);

  const members = staff.filter((s) => s.role === 'STAFF');
  const skillNames = Array.from(
    new Set([...members.flatMap((s) => s.skills), ...skillDefs]),
  ).filter(Boolean);

  function rankHolders(value: number) {
    return members.filter((s) => s.rank === value);
  }
  function skillHolders(skill: string) {
    return members.filter((s) => s.skills.includes(skill));
  }

  async function addRankHolder(value: number, staffId: string) {
    const s = members.find((m) => m.id === staffId);
    if (!s) return;
    await updateStaff(staffId, value, s.skills);
    setPickerFor(null);
    showToast('保有者を追加しました ✓');
  }
  async function removeRankHolder(staffId: string) {
    const s = members.find((m) => m.id === staffId);
    if (!s) return;
    await updateStaff(staffId, null, s.skills);
  }

  async function addSkillHolder(skill: string, staffId: string) {
    const s = members.find((m) => m.id === staffId);
    if (!s || s.skills.includes(skill)) return;
    await updateStaff(staffId, s.rank, [...s.skills, skill]);
    setPickerFor(null);
    showToast('保有者を追加しました ✓');
  }
  async function removeSkillHolder(skill: string, staffId: string) {
    const s = members.find((m) => m.id === staffId);
    if (!s) return;
    await updateStaff(staffId, s.rank, s.skills.filter((x) => x !== skill));
  }

  function addSkillDef() {
    const name = newSkill.trim();
    if (!name || skillNames.includes(name)) { setNewSkill(''); return; }
    setSkillDefs([...skillDefs, name]);
    setNewSkill('');
  }
  function removeSkillDef(skill: string) {
    setSkillDefs(skillDefs.filter((x) => x !== skill));
    for (const s of skillHolders(skill)) {
      void updateStaff(s.id, s.rank, s.skills.filter((x) => x !== skill));
    }
  }

  const rows: { key: string; name: string; holders: typeof members; onAdd: (id: string) => void; onRemove: (id: string) => void; onDelete?: () => void }[] =
    tab === 'rank'
      ? RANK_TIERS.map((t) => ({
        key: t.name,
        name: t.name,
        holders: rankHolders(t.value),
        onAdd: (id) => void addRankHolder(t.value, id),
        onRemove: (id) => void removeRankHolder(id),
      }))
      : skillNames.map((sk) => ({
        key: sk,
        name: sk,
        holders: skillHolders(sk),
        onAdd: (id) => void addSkillHolder(sk, id),
        onRemove: (id) => void removeSkillHolder(sk, id),
        onDelete: () => removeSkillDef(sk),
      }));

  const visibleRows = rows.filter((r) => r.name.includes(query.trim()));

  return (
    <div className="rk-reference-panel rk-ranks">
      <div className="rk-ref-toolbar rk-ranks__head">
        <div className="rk-ranks__tabs" role="tablist" aria-label="ランク・スキル切替">
          <button type="button" role="tab" aria-selected={tab === 'rank'} onClick={() => setTab('rank')}>ランク</button>
          <button type="button" role="tab" aria-selected={tab === 'skill'} onClick={() => setTab('skill')}>スキル</button>
        </div>
        <label>
          <span>{tab === 'rank' ? 'ランク検索' : 'スキル検索'}</span>
          <input
            type="search"
            aria-label={tab === 'rank' ? 'ランク名から検索' : 'スキル名から検索'}
            placeholder={tab === 'rank' ? 'S / A / B...' : '接客 / 調理...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="rk-status-metrics rk-ranks__metrics">
        <article><span>対象スタッフ</span><strong>{members.length}</strong></article>
        <article><span>ランク階層</span><strong>{RANK_TIERS.length}</strong></article>
        <article><span>スキル数</span><strong>{skillNames.length}</strong></article>
        <article><span>表示行</span><strong>{visibleRows.length}</strong></article>
      </div>

      <p className="muted-sm">
        {tab === 'rank'
          ? 'ランクは S・A・B・C・D の5段階です。「保有者を追加」でスタッフを割り当てると、その日の労働力把握に使えます。'
          : 'スキルごとに保有者を管理します。「保有者を追加」でスタッフに付与できます。'}
      </p>

      <div className="rk-table-scroll">
        <table className="rk-reference-table rk-compact-table rk-ranks__table">
          <thead>
            <tr>
              <th scope="col">{tab === 'rank' ? 'ランク名' : 'スキル名'}</th>
              <th scope="col">保有者</th>
              <th scope="col" className="rk-ranks__del-col">削除</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const holderIds = new Set(row.holders.map((h) => h.id));
              const candidates = members.filter((m) => !holderIds.has(m.id));
              return (
                <tr key={row.key}>
                  <th scope="row" className="rk-ranks__name">{row.name}</th>
                  <td>
                    <div className="rk-ranks__holders">
                      {row.holders.map((h) => (
                        <span className="rk-ranks__chip" key={h.id}>
                          {h.name}
                          <button type="button" aria-label={`${h.name}を外す`} onClick={() => row.onRemove(h.id)}>×</button>
                        </span>
                      ))}
                      {pickerFor === row.key ? (
                        <select
                          aria-label={`${row.name}に保有者を追加`}
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) row.onAdd(e.target.value); }}
                        >
                          <option value="" disabled>スタッフを選択</option>
                          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <button type="button" className="rk-ranks__add" onClick={() => setPickerFor(row.key)}>
                          保有者を追加
                        </button>
                      )}
                      <span className="rk-ranks__count">{row.holders.length}名</span>
                    </div>
                  </td>
                  <td className="rk-ranks__del-col">
                    {row.onDelete && (
                      <button type="button" className="rk-ranks__del" onClick={row.onDelete}>削除</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tab === 'skill' && (
        <div className="rk-ranks__new">
          <input
            className="text-input"
            aria-label="新しいスキル名"
            placeholder="新しいスキル名（例：レジ）"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={addSkillDef}>スキルを追加</button>
        </div>
      )}
    </div>
  );
}

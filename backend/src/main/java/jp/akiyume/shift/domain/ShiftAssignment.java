package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shift_assignments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "date", "slot", "staff_id"}))
public class ShiftAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkSlot slot;

    @ManyToOne(optional = false)
    @JoinColumn(name = "staff_id")
    private Staff staff;

    /** 任意の開始時刻 "HH:MM"。null の場合は slot 既定の時間帯（早/遅）に従う。 */
    @Column(name = "start_time", length = 5)
    private String startTime;

    /** 任意の終了時刻 "HH:MM"。null の場合は slot 既定の時間帯に従う。 */
    @Column(name = "end_time", length = 5)
    private String endTime;

    /** 勤務メモ。100 文字制限はフロントで担保。サーバは余裕を持って 500 まで許す。 */
    @Column(name = "work_memo", length = 500)
    private String workMemo;

    /**
     * タスク（業務内容）。チェックされたタスク名をカンマ区切りで保存する。
     * 例: "オープン,レジ締め,仕込み"。店舗ごとの ENUM ではなく、店舗のタスクマスタが将来増える前提で
     * 自由文字列の集合として持つ。空文字 / null は「タスク未指定」と等価。
     */
    @Column(name = "tasks", length = 500)
    private String tasks;

    /** 休憩時間。1 つの割当に 0..N 個。順序保持のため List + @OrderColumn。 */
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderColumn(name = "sort_order")
    private List<ShiftAssignmentBreak> breaks = new ArrayList<>();

    protected ShiftAssignment() {}

    public ShiftAssignment(Store store, LocalDate date, WorkSlot slot, Staff staff) {
        this.store = store;
        this.date = date;
        this.slot = slot;
        this.staff = staff;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public LocalDate getDate() { return date; }
    public WorkSlot getSlot() { return slot; }
    public Staff getStaff() { return staff; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public String getWorkMemo() { return workMemo; }
    public String getTasks() { return tasks; }
    public List<ShiftAssignmentBreak> getBreaks() { return breaks; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public void setWorkMemo(String workMemo) { this.workMemo = workMemo; }
    public void setTasks(String tasks) { this.tasks = tasks; }
    /** 既存 breaks をクリアして渡された値で置き換える。orphanRemoval=true なので孤児は消える。 */
    public void replaceBreaks(List<ShiftAssignmentBreak> next) {
        this.breaks.clear();
        if (next != null) {
            for (ShiftAssignmentBreak b : next) {
                b.setAssignment(this);
                this.breaks.add(b);
            }
        }
    }
}

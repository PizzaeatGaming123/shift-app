package jp.akiyume.shift.domain;

import jakarta.persistence.*;

/**
 * シフト割当に紐づく休憩時間（1 つの割当に 0..N 個）。
 * 「参考UI」風モーダルで「休憩時間を追加」した分が並ぶ。
 */
@Entity
@Table(name = "shift_assignment_breaks")
public class ShiftAssignmentBreak {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id")
    private ShiftAssignment assignment;

    /** 休憩開始 "HH:MM"。 */
    @Column(name = "start_time", nullable = false, length = 5)
    private String startTime;

    /** 休憩終了 "HH:MM"。 */
    @Column(name = "end_time", nullable = false, length = 5)
    private String endTime;

    protected ShiftAssignmentBreak() {}

    public ShiftAssignmentBreak(String startTime, String endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public Long getId() { return id; }
    public ShiftAssignment getAssignment() { return assignment; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public void setAssignment(ShiftAssignment assignment) { this.assignment = assignment; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
}

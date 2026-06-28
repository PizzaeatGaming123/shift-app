package jp.akiyume.shift.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/** AGENTS.md §必須機能10：公開済みシフトに対する変更の履歴。 */
@Entity
@Table(name = "shift_change_history")
public class ShiftChangeHistory {

    public enum Action { ASSIGN, UNASSIGN }

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Action action;

    @Column(nullable = false, length = 64)
    private String changedBy;

    @Column(nullable = false)
    private Instant changedAt;

    @Column(length = 200)
    private String reason;

    @Column(nullable = false)
    private boolean acknowledged;

    protected ShiftChangeHistory() {}

    public ShiftChangeHistory(Store store, LocalDate date, WorkSlot slot, Staff staff,
                              Action action, String changedBy, String reason) {
        this.store = store;
        this.date = date;
        this.slot = slot;
        this.staff = staff;
        this.action = action;
        this.changedBy = changedBy;
        this.changedAt = Instant.now();
        this.reason = reason;
        this.acknowledged = false;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public LocalDate getDate() { return date; }
    public WorkSlot getSlot() { return slot; }
    public Staff getStaff() { return staff; }
    public Action getAction() { return action; }
    public String getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
    public String getReason() { return reason; }
    public boolean isAcknowledged() { return acknowledged; }

    public void acknowledge() { this.acknowledged = true; }
}

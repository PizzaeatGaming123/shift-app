package jp.akiyume.shift.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** 店舗×対象月（YYYY-MM）ごとのシフト計画状態。AGENTS.md §必須機能9 を永続化する。 */
@Entity
@Table(name = "shift_plans",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "target_month"}))
public class ShiftPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "store_id")
    private Store store;

    /** 'YYYY-MM' 形式。H2 では month が予約語のため列名は target_month。 */
    @Column(name = "target_month", nullable = false, length = 7)
    private String month;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ShiftPlanStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected ShiftPlan() {}

    public ShiftPlan(Store store, String month, ShiftPlanStatus status) {
        this.store = store;
        this.month = month;
        this.status = status;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public String getMonth() { return month; }
    public ShiftPlanStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(ShiftPlanStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }
}

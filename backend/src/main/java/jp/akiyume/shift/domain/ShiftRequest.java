package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "shift_requests",
       uniqueConstraints = @UniqueConstraint(columnNames = {"staff_id", "date", "slot"}))
public class ShiftRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "staff_id")
    private Staff staff;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestSlot slot;

    @Column(length = 5)
    private String startTime;

    @Column(length = 5)
    private String endTime;

    // 既存DBへの ddl-auto:update 追加を許すため nullable。
    // 新規行は常にコンストラクタで DRAFT に初期化されるため実害はない。
    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private RequestStatus status = RequestStatus.DRAFT;

    protected ShiftRequest() {}

    public ShiftRequest(Staff staff, LocalDate date, RequestSlot slot) {
        this(staff, date, slot,
                slot == RequestSlot.EARLY ? "07:00" : slot == RequestSlot.LATE ? "15:00" : null,
                slot == RequestSlot.EARLY ? "16:00" : slot == RequestSlot.LATE ? "24:00" : null);
    }

    public ShiftRequest(Staff staff, LocalDate date, RequestSlot slot, String startTime, String endTime) {
        this.staff = staff;
        this.date = date;
        this.slot = slot;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = RequestStatus.DRAFT;
    }

    public Long getId() { return id; }
    public Staff getStaff() { return staff; }
    public LocalDate getDate() { return date; }
    public RequestSlot getSlot() { return slot; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public RequestStatus getStatus() { return status; }

    public void setStatus(RequestStatus status) { this.status = status; }
}

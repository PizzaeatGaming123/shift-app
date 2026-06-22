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

    protected ShiftRequest() {}

    public ShiftRequest(Staff staff, LocalDate date, RequestSlot slot) {
        this.staff = staff;
        this.date = date;
        this.slot = slot;
    }

    public Long getId() { return id; }
    public Staff getStaff() { return staff; }
    public LocalDate getDate() { return date; }
    public RequestSlot getSlot() { return slot; }
}

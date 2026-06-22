package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

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
}

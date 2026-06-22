package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

/** スタッフの日次ひとこと（交代・応援依頼などのメモ）。 */
@Entity
@Table(name = "day_notes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"staff_id", "date"}))
public class DayNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "staff_id")
    private Staff staff;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 200)
    private String text;

    protected DayNote() {}

    public DayNote(Staff staff, LocalDate date, String text) {
        this.staff = staff;
        this.date = date;
        this.text = text;
    }

    public Long getId() { return id; }
    public Staff getStaff() { return staff; }
    public LocalDate getDate() { return date; }
    public String getText() { return text; }

    public void setText(String text) { this.text = text; }
}

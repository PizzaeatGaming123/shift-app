package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

/** 店長が日ごとに残す店舗メモ。 */
@Entity
@Table(name = "store_notes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "date"}))
public class StoreNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 200)
    private String text;

    protected StoreNote() {}

    public StoreNote(Store store, LocalDate date, String text) {
        this.store = store;
        this.date = date;
        this.text = text;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public LocalDate getDate() { return date; }
    public String getText() { return text; }

    public void setText(String text) { this.text = text; }
}

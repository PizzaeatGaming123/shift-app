package jp.akiyume.shift.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

/** 店長が日ごとに出す追加募集（メッセージ付き）。 */
@Entity
@Table(name = "recruitments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "date"}))
public class Recruitment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 200)
    private String message;

    protected Recruitment() {}

    public Recruitment(Store store, LocalDate date, String message) {
        this.store = store;
        this.date = date;
        this.message = message;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public LocalDate getDate() { return date; }
    public String getMessage() { return message; }

    public void setMessage(String message) { this.message = message; }
}

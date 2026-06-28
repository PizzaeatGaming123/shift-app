package jp.akiyume.shift.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "stores")
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    protected Store() {}

    public Store(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
}

package jp.akiyume.shift.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "staff", uniqueConstraints = @UniqueConstraint(columnNames = "username"))
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "store_id")
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private Integer hourlyWage; // Phase 1 用、null 可

    protected Staff() {}

    public Staff(String username, String passwordHash, String name, Store store,
                 EmploymentType employmentType, Role role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.name = name;
        this.store = store;
        this.employmentType = employmentType;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public Store getStore() { return store; }
    public EmploymentType getEmploymentType() { return employmentType; }
    public Role getRole() { return role; }
    public Integer getHourlyWage() { return hourlyWage; }
}

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

    private Integer rank; // 1〜5 の労働力ランク、null 可

    @Column(length = 200)
    private String skills; // 保有スキル（カンマ区切り）、null 可

    @Column(name = "monthly_hour_limit")
    private Integer monthlyHourLimit; // 扶養等の月労働時間上限、null = 制限なし

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
    public Integer getRank() { return rank; }
    public String getSkills() { return skills; }
    public Integer getMonthlyHourLimit() { return monthlyHourLimit; }

    public void setRank(Integer rank) { this.rank = rank; }
    public void setSkills(String skills) { this.skills = skills; }
    public void setHourlyWage(Integer hourlyWage) { this.hourlyWage = hourlyWage; }
    public void setMonthlyHourLimit(Integer monthlyHourLimit) { this.monthlyHourLimit = monthlyHourLimit; }
}

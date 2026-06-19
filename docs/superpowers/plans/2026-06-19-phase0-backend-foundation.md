# Phase 0: バックエンド基盤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存 React フロントを localStorage からサーバーAPIへ切り替え、Spring Boot + H2 + セッションCookie認証で複数ユーザー・複数端末が同じシフトデータを共有できるようにする。

**Architecture:** モノレポ。`frontend/`（既存React）と `backend/`（Spring Boot 3.x / Java 21 / Maven wrapper）。バックエンドは JPA エンティティ + リポジトリ + サービス + REST コントローラの層構成。認証は Spring Security のセッションCookie。開発時は Vite dev proxy で `/api`→:8080 を同一オリジン化。

**Tech Stack:** Spring Boot 3.x, Java 21, Maven (wrapper), Spring Web / Data JPA / Security / Validation, H2 (file), JUnit 5 + spring-security-test, React + Vite + TS（既存）。

> コミットメッセージに `Co-Authored-By` 等の Claude 帰属トレーラーは付けない（プレーンなメッセージのみ）。
> パッケージ: `jp.akiyume.shift`。backend の artifactId: `shift-backend`。
> backend のコマンドは `backend/` ディレクトリで `./mvnw ...`（Windows は `mvnw.cmd`、Git Bash なら `./mvnw`）。

---

## File Structure

```
shift-app/
├── frontend/                         # 既存Reactを丸ごと移動
│   ├── src/
│   │   ├── api/client.ts             # 新規: fetchベースAPIクライアント
│   │   ├── api/client.test.ts        # 新規
│   │   ├── components/Login.tsx      # 新規: ログイン画面
│   │   ├── store/AppContext.tsx      # 改修: API取得 + 認証状態
│   │   ├── components/Header.tsx     # 改修: 役割トグル廃止
│   │   ├── App.tsx                   # 改修: 認証ゲート
│   │   └── (既存 types/lib/store/components はそのまま)
│   ├── vite.config.ts                # 改修: server.proxy 追加
│   └── (package.json 等)
├── backend/
│   ├── mvnw, mvnw.cmd, .mvn/
│   ├── pom.xml
│   └── src/
│       ├── main/java/jp/akiyume/shift/
│       │   ├── ShiftBackendApplication.java
│       │   ├── domain/                # エンティティ + enum
│       │   │   ├── Store.java Staff.java ShiftRequest.java ShiftAssignment.java
│       │   │   ├── Role.java EmploymentType.java RequestSlot.java WorkSlot.java
│       │   ├── repo/                  # リポジトリ
│       │   │   ├── StoreRepository.java StaffRepository.java
│       │   │   ├── ShiftRequestRepository.java ShiftAssignmentRepository.java
│       │   │   ├── service/RequestService.java AssignmentService.java
│       │   ├── web/                   # コントローラ + DTO
│       │   │   ├── AuthController.java StoreController.java
│       │   │   ├── RequestController.java AssignmentController.java
│       │   │   ├── dto/...
│       │   ├── security/SecurityConfig.java StaffUserDetailsService.java
│       │   └── seed/DataSeeder.java
│       ├── main/resources/application.yml
│       └── test/java/jp/akiyume/shift/...
└── docs/, README.md, .gitignore
```

---

## Task 1: 既存Reactを frontend/ へ移動

**Files:** 既存フロント一式を `frontend/` 配下へ移動。

- [ ] **Step 1: frontend ディレクトリを作成し、トラッキング済みファイルを git mv**

Run（プロジェクト直下 `C:\Users\User\shift-app` で。Git Bash）:

```bash
mkdir -p frontend
git mv index.html package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json src frontend/
git mv README.md frontend/README.md
```

- [ ] **Step 2: gitignore されている node_modules を物理移動（再インストール回避）**

```bash
mv node_modules frontend/ 2>/dev/null || true
```

（移動できなければ後で `cd frontend && npm install` で復旧可。）

- [ ] **Step 3: frontend が動くことを確認**

```bash
cd frontend
npm test
```
Expected: 34 tests PASS（移動だけなので変化なし）

- [ ] **Step 4: ルート .gitignore に backend/frontend 用エントリを追記**

`C:\Users\User\shift-app\.gitignore` の末尾に追記:

```gitignore
# Backend (Spring Boot / Maven)
backend/target/
backend/.gradle/
backend/build/
data/
*.mv.db
*.trace.db

# Frontend nested
frontend/node_modules/
frontend/dist/
```

- [ ] **Step 5: コミット**

```bash
cd C:/Users/User/shift-app
git add -A
git commit -m "refactor: move React app into frontend/ for monorepo"
```

---

## Task 2: Spring Boot プロジェクトを backend/ に生成

**Files:** `backend/`（Spring Initializr 生成物 + mvnw wrapper）

- [ ] **Step 1: Spring Initializr から zip を取得して展開**

Run（プロジェクト直下。PowerShell ツールで実行推奨）:

```powershell
Invoke-WebRequest -Uri "https://start.spring.io/starter.zip?type=maven-project&language=java&javaVersion=21&groupId=jp.akiyume&artifactId=shift-backend&name=shift-backend&packageName=jp.akiyume.shift&dependencies=web,data-jpa,security,validation,h2" -OutFile backend.zip
Expand-Archive -Path backend.zip -DestinationPath backend -Force
Remove-Item backend.zip
```

- [ ] **Step 2: spring-security-test 依存を pom.xml に追加**

`backend/pom.xml` の `<dependencies>` 内に追加:

```xml
		<dependency>
			<groupId>org.springframework.security</groupId>
			<artifactId>spring-security-test</artifactId>
			<scope>test</scope>
		</dependency>
```

- [ ] **Step 3: ビルドが通ることを確認（依存ダウンロード）**

Run:

```bash
cd backend
./mvnw -q compile
```
Expected: BUILD SUCCESS（初回は依存DLで時間がかかる）

- [ ] **Step 4: コミット**

```bash
cd C:/Users/User/shift-app
git add backend .gitignore
git commit -m "chore: scaffold Spring Boot backend (web, jpa, security, h2)"
```

---

## Task 3: application.yml（H2ファイルDB設定）

**Files:**
- Modify/Create: `backend/src/main/resources/application.yml`（生成された `application.properties` は削除）

- [ ] **Step 1: properties を削除し yml を作成**

```bash
rm -f backend/src/main/resources/application.properties
```

Create `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/shiftdb;AUTO_SERVER=TRUE
    username: sa
    password: ""
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
    properties:
      hibernate.dialect: org.hibernate.dialect.H2Dialect
  h2:
    console:
      enabled: true
      path: /h2-console
server:
  port: 8080
```

- [ ] **Step 2: アプリ起動確認 → 停止**

Run:

```bash
cd backend
./mvnw spring-boot:run
```
Expected: ログに `Started ShiftBackendApplication`、:8080 で起動。確認後 Ctrl+C。

- [ ] **Step 3: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/resources
git commit -m "feat(backend): configure H2 file datasource via application.yml"
```

---

## Task 4: enum 群

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/domain/Role.java`, `EmploymentType.java`, `RequestSlot.java`, `WorkSlot.java`

これらの enum は JSON では既存フロントの文字列（`early`/`late`/`off`、`正社員`/`パート`）にシリアライズする。

- [ ] **Step 1: Role を作成**

Create `Role.java`:

```java
package jp.akiyume.shift.domain;

public enum Role {
    STAFF,
    MANAGER
}
```

- [ ] **Step 2: EmploymentType を作成（JSONは日本語ラベル）**

Create `EmploymentType.java`:

```java
package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum EmploymentType {
    FULL_TIME("正社員"),
    PART_TIME("パート");

    private final String label;

    EmploymentType(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }
}
```

- [ ] **Step 3: RequestSlot を作成（early/late/off）**

Create `RequestSlot.java`:

```java
package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum RequestSlot {
    EARLY("early"),
    LATE("late"),
    OFF("off");

    private final String code;

    RequestSlot(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
```

- [ ] **Step 4: WorkSlot を作成（early/late）**

Create `WorkSlot.java`:

```java
package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum WorkSlot {
    EARLY("early"),
    LATE("late");

    private final String code;

    WorkSlot(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public static WorkSlot fromCode(String code) {
        for (WorkSlot s : values()) {
            if (s.code.equals(code)) return s;
        }
        throw new IllegalArgumentException("Unknown work slot: " + code);
    }
}
```

- [ ] **Step 5: コンパイル確認 + コミット**

```bash
cd backend && ./mvnw -q compile
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/domain
git commit -m "feat(backend): add domain enums"
```

---

## Task 5: エンティティ（Store, Staff, ShiftRequest, ShiftAssignment）

**Files:**
- Create: `domain/Store.java`, `Staff.java`, `ShiftRequest.java`, `ShiftAssignment.java`

- [ ] **Step 1: Store を作成**

Create `Store.java`:

```java
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
```

- [ ] **Step 2: Staff を作成**

Create `Staff.java`:

```java
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
```

- [ ] **Step 3: ShiftRequest を作成**

Create `ShiftRequest.java`:

```java
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
```

- [ ] **Step 4: ShiftAssignment を作成**

Create `ShiftAssignment.java`:

```java
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
```

- [ ] **Step 5: コンパイル確認 + コミット**

```bash
cd backend && ./mvnw -q compile
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/domain
git commit -m "feat(backend): add JPA entities"
```

---

## Task 6: リポジトリ（@DataJpaTest）

**Files:**
- Create: `repo/StoreRepository.java`, `StaffRepository.java`, `ShiftRequestRepository.java`, `ShiftAssignmentRepository.java`
- Test: `backend/src/test/java/jp/akiyume/shift/repo/StaffRepositoryTest.java`

- [ ] **Step 1: 失敗するリポジトリテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/repo/StaffRepositoryTest.java`:

```java
package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class StaffRepositoryTest {

    @Autowired StoreRepository storeRepository;
    @Autowired StaffRepository staffRepository;

    @Test
    void findByUsername_returnsStaff() {
        Store store = storeRepository.save(new Store("中島店"));
        staffRepository.save(new Staff("yamada", "hash", "山田", store,
                EmploymentType.FULL_TIME, Role.MANAGER));

        var found = staffRepository.findByUsername("yamada");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("山田");
        assertThat(found.get().getRole()).isEqualTo(Role.MANAGER);
    }

    @Test
    void findByStoreId_returnsStoreStaff() {
        Store a = storeRepository.save(new Store("中島店"));
        Store b = storeRepository.save(new Store("新田店"));
        staffRepository.save(new Staff("u1", "h", "A", a, EmploymentType.PART_TIME, Role.STAFF));
        staffRepository.save(new Staff("u2", "h", "B", b, EmploymentType.PART_TIME, Role.STAFF));

        assertThat(staffRepository.findByStoreId(a.getId())).hasSize(1);
    }
}
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=StaffRepositoryTest test
```
Expected: コンパイルエラー（リポジトリ未定義）

- [ ] **Step 3: リポジトリを実装**

Create `repo/StoreRepository.java`:

```java
package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}
```

Create `repo/StaffRepository.java`:

```java
package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    Optional<Staff> findByUsername(String username);
    List<Staff> findByStoreId(Long storeId);
}
```

Create `repo/ShiftRequestRepository.java`:

```java
package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ShiftRequestRepository extends JpaRepository<ShiftRequest, Long> {
    List<ShiftRequest> findByStaff_Store_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    List<ShiftRequest> findByStaff_IdAndDate(Long staffId, LocalDate date);
    void deleteByStaff_IdAndDate(Long staffId, LocalDate date);
}
```

Create `repo/ShiftAssignmentRepository.java`:

```java
package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftAssignment;
import jp.akiyume.shift.domain.WorkSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {
    List<ShiftAssignment> findByStore_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    Optional<ShiftAssignment> findByStore_IdAndDateAndSlotAndStaff_Id(
            Long storeId, LocalDate date, WorkSlot slot, Long staffId);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=StaffRepositoryTest test
```
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/repo backend/src/test
git commit -m "feat(backend): add JPA repositories"
```

---

## Task 7: シード投入（DataSeeder）

**Files:**
- Create: `seed/DataSeeder.java`
- Test: `backend/src/test/java/jp/akiyume/shift/seed/DataSeederTest.java`

- [ ] **Step 1: 失敗するテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/seed/DataSeederTest.java`:

```java
package jp.akiyume.shift.seed;

import jp.akiyume.shift.domain.Role;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DataSeederTest {

    @Autowired StoreRepository storeRepository;
    @Autowired StaffRepository staffRepository;

    @Test
    void seedsThreeStoresWithStaffAndOneManagerEach() {
        assertThat(storeRepository.findAll()).extracting("name")
                .contains("中島店", "新田店", "早島店");
        // 各店に最低1名の店長
        for (var store : storeRepository.findAll()) {
            long managers = staffRepository.findByStoreId(store.getId()).stream()
                    .filter(s -> s.getRole() == Role.MANAGER).count();
            assertThat(managers).isGreaterThanOrEqualTo(1);
        }
    }
}
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=DataSeederTest test
```
Expected: FAIL（seed未実装で店舗が無い）

> 注: `@SpringBootTest` はファイルH2を使う。テスト分離のため Step 3 のテスト用設定も併せて入れる。

- [ ] **Step 3: テスト用にインメモリH2を使う設定を追加**

Create `backend/src/test/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
  jpa:
    hibernate:
      ddl-auto: create-drop
```

- [ ] **Step 4: DataSeeder を実装**

Create `seed/DataSeeder.java`:

```java
package jp.akiyume.shift.seed;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(StoreRepository storeRepository, StaffRepository staffRepository,
                      PasswordEncoder passwordEncoder) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private record Person(String username, String name, EmploymentType type, Role role) {}

    @Override
    public void run(String... args) {
        if (storeRepository.count() > 0) return; // 既にseed済みなら何もしない

        seedStore("中島店", "nakashima", List.of(
                new Person("nakashima-mgr", "山田（店長）", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("nakashima-1", "佐藤", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-2", "鈴木", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-3", "高橋", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-4", "田中", EmploymentType.PART_TIME, Role.STAFF)));

        seedStore("新田店", "nitta", List.of(
                new Person("nitta-mgr", "伊藤（店長）", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("nitta-1", "渡辺", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nitta-2", "中村", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nitta-3", "小林", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nitta-4", "加藤", EmploymentType.PART_TIME, Role.STAFF)));

        seedStore("早島店", "hayashima", List.of(
                new Person("hayashima-mgr", "吉田（店長）", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("hayashima-1", "山本", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("hayashima-2", "松本", EmploymentType.PART_TIME, Role.STAFF),
                new Person("hayashima-3", "井上", EmploymentType.PART_TIME, Role.STAFF),
                new Person("hayashima-4", "木村", EmploymentType.PART_TIME, Role.STAFF)));
    }

    private void seedStore(String storeName, String prefix, List<Person> people) {
        Store store = storeRepository.save(new Store(storeName));
        String hash = passwordEncoder.encode("password");
        for (Person p : people) {
            staffRepository.save(new Staff(p.username(), hash, p.name(), store, p.type(), p.role()));
        }
    }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=DataSeederTest test
```
Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/seed backend/src/test
git commit -m "feat(backend): seed stores and staff with default password"
```

---

## Task 8: セキュリティ設定 + UserDetailsService

**Files:**
- Create: `security/StaffUserDetailsService.java`, `security/SecurityConfig.java`

- [ ] **Step 1: UserDetailsService を実装**

Create `security/StaffUserDetailsService.java`:

```java
package jp.akiyume.shift.security;

import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class StaffUserDetailsService implements UserDetailsService {

    private final StaffRepository staffRepository;

    public StaffUserDetailsService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Staff staff = staffRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
        return User.withUsername(staff.getUsername())
                .password(staff.getPasswordHash())
                .authorities("ROLE_" + staff.getRole().name())
                .build();
    }
}
```

- [ ] **Step 2: SecurityConfig を実装**

Create `security/SecurityConfig.java`:

```java
package jp.akiyume.shift.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/assignments").hasRole("MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/assignments").hasRole("MANAGER")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .headers(h -> h.frameOptions(f -> f.disable())) // h2-console 表示用
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .exceptionHandling(e -> e.authenticationEntryPoint(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

- [ ] **Step 3: コンパイル + 既存テストが壊れていないか確認**

Run:

```bash
cd backend && ./mvnw -q test
```
Expected: 既存テスト（Repository/Seeder）PASS

- [ ] **Step 4: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/security
git commit -m "feat(backend): add Spring Security session config and user details"
```

---

## Task 9: 認証コントローラ + DTO（MockMvcテスト）

**Files:**
- Create: `web/dto/LoginRequest.java`, `web/dto/MeResponse.java`, `web/AuthController.java`
- Test: `backend/src/test/java/jp/akiyume/shift/web/AuthControllerTest.java`

- [ ] **Step 1: 失敗するテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/web/AuthControllerTest.java`:

```java
package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void me_withoutLogin_returns401() throws Exception {
        mvc.perform(get("/api/auth/me"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    void login_thenMe_returnsUser() throws Exception {
        var session = mvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"nakashima-mgr\",\"password\":\"password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MANAGER"))
                .andReturn().getRequest().getSession();

        mvc.perform(get("/api/auth/me").session(
                (org.springframework.mock.web.MockHttpSession) session))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.name").value("山田（店長）"));
    }

    @Test
    void login_withWrongPassword_returns401() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"nakashima-mgr\",\"password\":\"wrong\"}"))
           .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=AuthControllerTest test
```
Expected: FAIL（コントローラ未実装）

- [ ] **Step 3: DTO を実装**

Create `web/dto/LoginRequest.java`:

```java
package jp.akiyume.shift.web.dto;

public record LoginRequest(String username, String password) {}
```

Create `web/dto/MeResponse.java`:

```java
package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Staff;

public record MeResponse(Long id, String name, String role, Long storeId) {
    public static MeResponse from(Staff staff) {
        return new MeResponse(staff.getId(), staff.getName(),
                staff.getRole().name(), staff.getStore().getId());
    }
}
```

- [ ] **Step 4: AuthController を実装**

Create `web/AuthController.java`:

```java
package jp.akiyume.shift.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.web.dto.LoginRequest;
import jp.akiyume.shift.web.dto.MeResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final StaffRepository staffRepository;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, StaffRepository staffRepository) {
        this.authenticationManager = authenticationManager;
        this.staffRepository = staffRepository;
    }

    @PostMapping("/login")
    public MeResponse login(@RequestBody LoginRequest body,
                            HttpServletRequest request, HttpServletResponse response) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(body.username(), body.password()));
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        Staff staff = staffRepository.findByUsername(body.username()).orElseThrow();
        return MeResponse.from(staff);
    }

    @GetMapping("/me")
    public MeResponse me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        Staff staff = staffRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return MeResponse.from(staff);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();
    }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=AuthControllerTest test
```
Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/web backend/src/test
git commit -m "feat(backend): add auth controller (login/logout/me)"
```

---

## Task 10: 店舗・スタッフ参照コントローラ（MockMvcテスト）

**Files:**
- Create: `web/dto/StoreDto.java`, `web/dto/StaffDto.java`, `web/StoreController.java`
- Test: `backend/src/test/java/jp/akiyume/shift/web/StoreControllerTest.java`

- [ ] **Step 1: 失敗するテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/web/StoreControllerTest.java`:

```java
package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StoreControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void stores_withoutLogin_returns401() throws Exception {
        mvc.perform(get("/api/stores")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr")
    void stores_loggedIn_returnsThree() throws Exception {
        mvc.perform(get("/api/stores"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    @WithMockUser(username = "nakashima-mgr")
    void storeStaff_returnsList() throws Exception {
        // 中島店(id=1想定) のスタッフが5名
        mvc.perform(get("/api/stores/1/staff"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(5));
    }
}
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=StoreControllerTest test
```
Expected: FAIL（コントローラ未実装）

- [ ] **Step 3: DTO を実装**

Create `web/dto/StoreDto.java`:

```java
package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Store;

public record StoreDto(Long id, String name) {
    public static StoreDto from(Store store) {
        return new StoreDto(store.getId(), store.getName());
    }
}
```

Create `web/dto/StaffDto.java`:

```java
package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Staff;

public record StaffDto(Long id, String name, String employmentType, String role) {
    public static StaffDto from(Staff staff) {
        return new StaffDto(staff.getId(), staff.getName(),
                staff.getEmploymentType().getLabel(), staff.getRole().name());
    }
}
```

- [ ] **Step 4: StoreController を実装**

Create `web/StoreController.java`:

```java
package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import jp.akiyume.shift.web.dto.StaffDto;
import jp.akiyume.shift.web.dto.StoreDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;

    public StoreController(StoreRepository storeRepository, StaffRepository staffRepository) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
    }

    @GetMapping
    public List<StoreDto> stores() {
        return storeRepository.findAll().stream().map(StoreDto::from).toList();
    }

    @GetMapping("/{storeId}/staff")
    public List<StaffDto> staff(@PathVariable Long storeId) {
        return staffRepository.findByStoreId(storeId).stream().map(StaffDto::from).toList();
    }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=StoreControllerTest test
```
Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift/web backend/src/test
git commit -m "feat(backend): add store and staff read endpoints"
```

---

## Task 11: 希望サービス + コントローラ（MockMvcテスト）

**Files:**
- Create: `repo/service/RequestService.java`, `web/dto/RequestDto.java`, `web/dto/SetRequestBody.java`, `web/RequestController.java`
- Test: `backend/src/test/java/jp/akiyume/shift/web/RequestControllerTest.java`

希望の値（none/early/late/both/off）→ ShiftRequest 行への変換は、フロントの setDayRequest と同じロジック。

- [ ] **Step 1: 失敗するテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/web/RequestControllerTest.java`:

```java
package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RequestControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-1")
    void putRequest_both_thenGet_showsEarlyAndLate() throws Exception {
        mvc.perform(put("/api/requests")
                .contentType("application/json")
                .content("{\"date\":\"2026-07-01\",\"value\":\"both\"}"))
           .andExpect(status().isOk());

        // 中島店(id=1) の7月希望に early/late が含まれる
        mvc.perform(get("/api/stores/1/requests?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser(username = "nakashima-1")
    void putRequest_off_replacesPrevious() throws Exception {
        mvc.perform(put("/api/requests").contentType("application/json")
                .content("{\"date\":\"2026-07-02\",\"value\":\"early\"}"))
           .andExpect(status().isOk());
        mvc.perform(put("/api/requests").contentType("application/json")
                .content("{\"date\":\"2026-07-02\",\"value\":\"off\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].slot").value("off"));
    }
}
```

> 注: PUT は「更新後のその日の希望レコード配列」を返す仕様にする（上記アサーション）。

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=RequestControllerTest test
```
Expected: FAIL（未実装）

- [ ] **Step 3: DTO を実装**

Create `web/dto/RequestDto.java`:

```java
package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftRequest;

public record RequestDto(Long staffId, String date, String slot) {
    public static RequestDto from(ShiftRequest r) {
        return new RequestDto(r.getStaff().getId(), r.getDate().toString(), r.getSlot().getCode());
    }
}
```

Create `web/dto/SetRequestBody.java`:

```java
package jp.akiyume.shift.web.dto;

public record SetRequestBody(String date, String value) {}
```

- [ ] **Step 4: RequestService を実装**

Create `repo/service/RequestService.java`:

```java
package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.ShiftRequestRepository;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RequestService {

    private final ShiftRequestRepository requestRepository;
    private final StaffRepository staffRepository;

    public RequestService(ShiftRequestRepository requestRepository, StaffRepository staffRepository) {
        this.requestRepository = requestRepository;
        this.staffRepository = staffRepository;
    }

    /** その日の希望をまるごと置き換える（none/early/late/both/off）。更新後の当日レコードを返す。 */
    @Transactional
    public List<ShiftRequest> setDayRequest(String username, LocalDate date, String value) {
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);

        List<ShiftRequest> added = new ArrayList<>();
        switch (value) {
            case "early" -> added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
            case "late" -> added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
            case "both" -> {
                added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
                added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
            }
            case "off" -> added.add(new ShiftRequest(staff, date, RequestSlot.OFF));
            case "none" -> { /* 何も追加しない */ }
            default -> throw new IllegalArgumentException("Unknown value: " + value);
        }
        return requestRepository.saveAll(added);
    }

    public List<ShiftRequest> findByStoreAndMonth(Long storeId, LocalDate from, LocalDate to) {
        return requestRepository.findByStaff_Store_IdAndDateBetween(storeId, from, to);
    }
}
```

- [ ] **Step 5: RequestController を実装**

Create `web/RequestController.java`:

```java
package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.RequestService;
import jp.akiyume.shift.web.dto.RequestDto;
import jp.akiyume.shift.web.dto.SetRequestBody;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @PutMapping("/requests")
    public List<RequestDto> setRequest(@RequestBody SetRequestBody body, Authentication auth) {
        LocalDate date = LocalDate.parse(body.date());
        return requestService.setDayRequest(auth.getName(), date, body.value())
                .stream().map(RequestDto::from).toList();
    }

    @GetMapping("/stores/{storeId}/requests")
    public List<RequestDto> requests(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return requestService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(RequestDto::from).toList();
    }
}
```

- [ ] **Step 6: テストが通ることを確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=RequestControllerTest test
```
Expected: PASS

- [ ] **Step 7: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift backend/src/test
git commit -m "feat(backend): add shift request endpoints"
```

---

## Task 12: 割り当てサービス + コントローラ（権限テスト含む）

**Files:**
- Create: `repo/service/AssignmentService.java`, `web/dto/AssignmentDto.java`, `web/dto/AssignmentBody.java`, `web/AssignmentController.java`
- Test: `backend/src/test/java/jp/akiyume/shift/web/AssignmentControllerTest.java`

- [ ] **Step 1: 失敗するテストを書く**

Create `backend/src/test/java/jp/akiyume/shift/web/AssignmentControllerTest.java`:

```java
package jp.akiyume.shift.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AssignmentControllerTest {

    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void manager_canAssign_thenGet() throws Exception {
        mvc.perform(post("/api/assignments").contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":2}"))
           .andExpect(status().isOk());

        mvc.perform(get("/api/stores/1/assignments?month=2026-07"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.length()").value(1))
           .andExpect(jsonPath("$[0].slot").value("early"));
    }

    @Test
    @WithMockUser(username = "nakashima-1", roles = {"STAFF"})
    void staff_cannotAssign_returns403() throws Exception {
        mvc.perform(post("/api/assignments").contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"early\",\"staffId\":2}"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
    void delete_removesAssignment() throws Exception {
        mvc.perform(post("/api/assignments").contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-04\",\"slot\":\"late\",\"staffId\":3}"))
           .andExpect(status().isOk());
        mvc.perform(delete("/api/assignments").contentType("application/json")
                .content("{\"storeId\":1,\"date\":\"2026-07-04\",\"slot\":\"late\",\"staffId\":3}"))
           .andExpect(status().isOk());
        mvc.perform(get("/api/stores/1/assignments?month=2026-07"))
           .andExpect(jsonPath("$.length()").value(0));
    }
}
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd backend && ./mvnw -q -Dtest=AssignmentControllerTest test
```
Expected: FAIL（未実装）

- [ ] **Step 3: DTO を実装**

Create `web/dto/AssignmentDto.java`:

```java
package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftAssignment;

public record AssignmentDto(String date, String slot, Long staffId) {
    public static AssignmentDto from(ShiftAssignment a) {
        return new AssignmentDto(a.getDate().toString(), a.getSlot().getCode(), a.getStaff().getId());
    }
}
```

Create `web/dto/AssignmentBody.java`:

```java
package jp.akiyume.shift.web.dto;

public record AssignmentBody(Long storeId, String date, String slot, Long staffId) {}
```

- [ ] **Step 4: AssignmentService を実装**

Create `repo/service/AssignmentService.java`:

```java
package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.ShiftAssignmentRepository;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class AssignmentService {

    private final ShiftAssignmentRepository assignmentRepository;
    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;

    public AssignmentService(ShiftAssignmentRepository assignmentRepository,
                             StoreRepository storeRepository, StaffRepository staffRepository) {
        this.assignmentRepository = assignmentRepository;
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
    }

    @Transactional
    public void assign(Long storeId, LocalDate date, String slotCode, Long staffId) {
        WorkSlot slot = WorkSlot.fromCode(slotCode);
        if (assignmentRepository.findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId).isPresent()) {
            return; // 冪等
        }
        Store store = storeRepository.findById(storeId).orElseThrow();
        Staff staff = staffRepository.findById(staffId).orElseThrow();
        assignmentRepository.save(new ShiftAssignment(store, date, slot, staff));
    }

    @Transactional
    public void unassign(Long storeId, LocalDate date, String slotCode, Long staffId) {
        WorkSlot slot = WorkSlot.fromCode(slotCode);
        assignmentRepository
                .findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId)
                .ifPresent(assignmentRepository::delete);
    }

    public List<ShiftAssignment> findByStoreAndMonth(Long storeId, LocalDate from, LocalDate to) {
        return assignmentRepository.findByStore_IdAndDateBetween(storeId, from, to);
    }
}
```

- [ ] **Step 5: AssignmentController を実装**

Create `web/AssignmentController.java`:

```java
package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.AssignmentService;
import jp.akiyume.shift.web.dto.AssignmentBody;
import jp.akiyume.shift.web.dto.AssignmentDto;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping("/assignments")
    public void assign(@RequestBody AssignmentBody body) {
        assignmentService.assign(body.storeId(), LocalDate.parse(body.date()), body.slot(), body.staffId());
    }

    @DeleteMapping("/assignments")
    public void unassign(@RequestBody AssignmentBody body) {
        assignmentService.unassign(body.storeId(), LocalDate.parse(body.date()), body.slot(), body.staffId());
    }

    @GetMapping("/stores/{storeId}/assignments")
    public List<AssignmentDto> assignments(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return assignmentService.findByStoreAndMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(AssignmentDto::from).toList();
    }
}
```

- [ ] **Step 6: 全バックエンドテストを実行**

Run:

```bash
cd backend && ./mvnw -q test
```
Expected: 全テスト PASS（Repository / Seeder / Auth / Store / Request / Assignment）

- [ ] **Step 7: コミット**

```bash
cd C:/Users/User/shift-app
git add backend/src/main/java/jp/akiyume/shift backend/src/test
git commit -m "feat(backend): add assignment endpoints with manager-only access"
```

---

## Task 13: フロント — Vite dev proxy

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: proxy を追加**

`frontend/vite.config.ts` を以下にする:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/vitest.setup.ts',
  },
});
```

- [ ] **Step 2: 型チェック + コミット**

```bash
cd frontend && npx tsc --noEmit
cd C:/Users/User/shift-app
git add frontend/vite.config.ts
git commit -m "feat(frontend): proxy /api to backend in dev"
```

---

## Task 14: フロント — API クライアント（fetchモックテスト）

**Files:**
- Create: `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `frontend/src/api/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './client';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

describe('api.me', () => {
  it('GETs /api/auth/me with credentials', async () => {
    const spy = mockFetch({ id: 1, name: '山田', role: 'MANAGER', storeId: 1 });
    const me = await api.me();
    expect(me.role).toBe('MANAGER');
    expect(spy).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'include' }));
  });

  it('returns null on 401', async () => {
    mockFetch(null, false, 401);
    expect(await api.me()).toBeNull();
  });
});

describe('api.setRequest', () => {
  it('PUTs /api/requests', async () => {
    const spy = mockFetch([{ staffId: 1, date: '2026-07-01', slot: 'early' }]);
    await api.setRequest('2026-07-01', 'early');
    expect(spy).toHaveBeenCalledWith('/api/requests', expect.objectContaining({ method: 'PUT' }));
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run:

```bash
cd frontend && npx vitest run src/api/client.test.ts
```
Expected: FAIL（client 未実装）

- [ ] **Step 3: API クライアントを実装**

Create `frontend/src/api/client.ts`:

```ts
import type { DayRequestValue } from '../types';

export interface Me {
  id: number;
  name: string;
  role: 'STAFF' | 'MANAGER';
  storeId: number;
}
export interface ApiStore { id: number; name: string; }
export interface ApiStaff { id: number; name: string; employmentType: string; role: string; }
export interface ApiRequest { staffId: number; date: string; slot: 'early' | 'late' | 'off'; }
export interface ApiAssignment { date: string; slot: 'early' | 'late'; staffId: number; }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async me(): Promise<Me | null> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) return null;
    return json<Me>(res);
  },

  async login(username: string, password: string): Promise<Me> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) throw new Error('ユーザー名またはパスワードが違います');
    return json<Me>(res);
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },

  async stores(): Promise<ApiStore[]> {
    return json<ApiStore[]>(await fetch('/api/stores', { credentials: 'include' }));
  },

  async staff(storeId: number): Promise<ApiStaff[]> {
    return json<ApiStaff[]>(await fetch(`/api/stores/${storeId}/staff`, { credentials: 'include' }));
  },

  async requests(storeId: number, month: string): Promise<ApiRequest[]> {
    return json<ApiRequest[]>(await fetch(`/api/stores/${storeId}/requests?month=${month}`, { credentials: 'include' }));
  },

  async setRequest(date: string, value: DayRequestValue): Promise<ApiRequest[]> {
    const res = await fetch('/api/requests', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, value }),
    });
    return json<ApiRequest[]>(res);
  },

  async assignments(storeId: number, month: string): Promise<ApiAssignment[]> {
    return json<ApiAssignment[]>(await fetch(`/api/stores/${storeId}/assignments?month=${month}`, { credentials: 'include' }));
  },

  async assign(storeId: number, date: string, slot: 'early' | 'late', staffId: number): Promise<void> {
    await fetch('/api/assignments', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, date, slot, staffId }),
    });
  },

  async unassign(storeId: number, date: string, slot: 'early' | 'late', staffId: number): Promise<void> {
    await fetch('/api/assignments', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, date, slot, staffId }),
    });
  },
};
```

- [ ] **Step 4: テストが通ることを確認**

Run:

```bash
cd frontend && npx vitest run src/api/client.test.ts
```
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/User/shift-app
git add frontend/src/api
git commit -m "feat(frontend): add fetch-based API client"
```

---

## Task 15: フロント — AppContext を API ベースに改修

**Files:**
- Modify: `frontend/src/store/AppContext.tsx`（localStorage廃止、API取得＋認証状態）

既存の純粋ロジック（lib/date, store/requests, store/assignments）はそのまま再利用する。AppContext は「サーバから取得したデータを保持し、変更後に再取得する」役割に変える。`storage.ts`/`storage.test.ts`/`seed.ts`/`seed.test.ts`/`reducer.ts`/`reducer.test.ts` は不要になるため削除する。

- [ ] **Step 1: 不要になったフロントのデータ層を削除**

```bash
cd frontend
rm -f src/store/storage.ts src/store/storage.test.ts \
      src/store/seed.ts src/store/seed.test.ts \
      src/store/reducer.ts src/store/reducer.test.ts
```

- [ ] **Step 2: AppContext を実装**

Replace `frontend/src/store/AppContext.tsx` with:

```tsx
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api, type Me, type ApiStore, type ApiStaff, type ApiRequest, type ApiAssignment } from '../api/client';
import type { ShiftRequest, Assignment, Staff, Store, DayRequestValue } from '../types';

interface AppContextValue {
  me: Me | null;
  loading: boolean;
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  storeId: number | null;
  month: string; // 'YYYY-MM'
  setStoreId: (id: number) => void;
  setMonth: (month: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setDayRequest: (date: string, value: DayRequestValue) => Promise<void>;
  toggleAssignment: (date: string, slot: 'early' | 'late', staffId: string, assigned: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function toStore(s: ApiStore): Store { return { id: String(s.id), name: s.name }; }
function toStaff(s: ApiStaff, storeId: number): Staff {
  return {
    id: String(s.id),
    name: s.name,
    storeId: String(storeId),
    employmentType: s.employmentType === '正社員' ? '正社員' : 'パート',
  };
}
function toRequest(r: ApiRequest): ShiftRequest {
  return { staffId: String(r.staffId), date: r.date, slot: r.slot };
}
function toAssignment(a: ApiAssignment): Assignment {
  return { date: a.date, slot: a.slot, staffIds: [String(a.staffId)] };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [month, setMonth] = useState('2026-07');

  // 初回: ログイン状態を確認
  useEffect(() => {
    api.me().then((m) => {
      setMe(m);
      if (m) setStoreId(m.storeId);
    }).finally(() => setLoading(false));
  }, []);

  // ログイン後: 店舗一覧を取得
  useEffect(() => {
    if (!me) return;
    api.stores().then((list) => setStores(list.map(toStore)));
  }, [me]);

  const reloadStoreData = useCallback(async () => {
    if (!storeId) return;
    const [st, rq, as] = await Promise.all([
      api.staff(storeId),
      api.requests(storeId, month),
      api.assignments(storeId, month),
    ]);
    setStaff(st.map((s) => toStaff(s, storeId)));
    setRequests(rq.map(toRequest));
    setAssignments(as.map(toAssignment));
  }, [storeId, month]);

  useEffect(() => {
    if (me && storeId) void reloadStoreData();
  }, [me, storeId, month, reloadStoreData]);

  const login = useCallback(async (username: string, password: string) => {
    const m = await api.login(username, password);
    setMe(m);
    setStoreId(m.storeId);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setMe(null);
    setStores([]); setStaff([]); setRequests([]); setAssignments([]);
    setStoreId(null);
  }, []);

  const setDayRequest = useCallback(async (date: string, value: DayRequestValue) => {
    await api.setRequest(date, value);
    await reloadStoreData();
  }, [reloadStoreData]);

  const toggleAssignment = useCallback(
    async (date: string, slot: 'early' | 'late', staffId: string, assigned: boolean) => {
      if (!storeId) return;
      if (assigned) await api.unassign(storeId, date, slot, Number(staffId));
      else await api.assign(storeId, date, slot, Number(staffId));
      await reloadStoreData();
    }, [storeId, reloadStoreData]);

  const value = useMemo<AppContextValue>(() => ({
    me, loading, stores, staff, requests, assignments, storeId, month,
    setStoreId, setMonth, login, logout, setDayRequest, toggleAssignment,
  }), [me, loading, stores, staff, requests, assignments, storeId, month,
       login, logout, setDayRequest, toggleAssignment]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
```

- [ ] **Step 3: 型チェック（この時点では既存コンポーネントが古いAPIを使っており壊れる想定）**

Run:

```bash
cd frontend && npx tsc --noEmit
```
Expected: RequestEditor/ManagerMatrix/SharedView/App/Header が旧 `useApp` シグネチャ（data/dispatch）を使っておりエラー。次タスク以降で解消する。**この時点ではコミットしない。**

---

## Task 16: フロント — Login コンポーネント

**Files:**
- Create: `frontend/src/components/Login.tsx`

- [ ] **Step 1: Login を実装**

Create `frontend/src/components/Login.tsx`:

```tsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';

const DEMO_ACCOUNTS = [
  { label: '中島店 店長', username: 'nakashima-mgr' },
  { label: '中島店 スタッフ（佐藤）', username: 'nakashima-1' },
  { label: '新田店 店長', username: 'nitta-mgr' },
  { label: '早島店 店長', username: 'hayashima-mgr' },
];

export function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    }
  }

  return (
    <div className="app">
      <h1 className="logo" style={{ marginTop: 32 }}>暁夢シフト</h1>
      <form onSubmit={submit} style={{ maxWidth: 320 }}>
        <p>
          <label>ユーザー名<br />
            <input value={username} onChange={(e) => setUsername(e.target.value)}
                   style={{ width: '100%', padding: 8, fontSize: 16 }} />
          </label>
        </p>
        <p>
          <label>パスワード<br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   style={{ width: '100%', padding: 8, fontSize: 16 }} />
          </label>
        </p>
        {error && <p style={{ color: 'var(--low)' }}>{error}</p>}
        <button type="submit" className="role-toggle" style={{ padding: '10px 20px' }}>ログイン</button>
      </form>

      <div style={{ marginTop: 24, fontSize: 14, color: '#666' }}>
        <strong>デモ用アカウント</strong>（パスワードは全員 <code>password</code>）
        <ul>
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.username}>
              <button type="button" onClick={() => setUsername(a.username)}
                      style={{ cursor: 'pointer' }}>{a.label}: {a.username}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: コミットはまだ（Task 17 でまとめて型を通す）**

（このコンポーネント単体は新 `useApp` を使うので型は整合。次タスクで残りを直して一括コミット。）

---

## Task 17: フロント — Header / RequestEditor / ManagerMatrix / SharedView / App を新APIに適合

**Files:**
- Modify: `frontend/src/components/Header.tsx`, `RequestEditor.tsx`, `ManagerMatrix.tsx`, `SharedView.tsx`, `App.tsx`
- Modify: `frontend/src/components/ManagerMatrix.test.tsx`（Provider前提が変わるため調整）

新しい `useApp` は `data`/`dispatch` ではなく、`staff`/`requests`/`assignments`/`storeId`/`month` と各操作関数を直接提供する。各コンポーネントを合わせる。

- [ ] **Step 1: Header を実装（役割トグル廃止、ログアウト追加）**

Replace `frontend/src/components/Header.tsx` with:

```tsx
import type { Store } from '../types';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  userName: string;
  roleLabel: string;
  onLogout: () => void;
}

export function Header({ stores, storeId, onStoreChange, userName, roleLabel, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <span className="logo">暁夢シフト</span>
      <select value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="role-toggle">
        <span style={{ alignSelf: 'center', fontSize: 14, color: '#666' }}>
          {userName}（{roleLabel}）
        </span>
        <button onClick={onLogout}>ログアウト</button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: RequestEditor を実装（新API）**

Replace `frontend/src/components/RequestEditor.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { MonthCalendar } from './MonthCalendar';
import type { DayRequestValue } from '../types';

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};

interface RequestEditorProps {
  year: number;
  month: number;
}

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, setDayRequest } = useApp();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const myStaffId = me ? String(me.id) : '';

  function setValue(value: DayRequestValue) {
    if (!selectedDate) return;
    void setDayRequest(selectedDate, value);
  }

  const current = selectedDate ? getDayRequest(requests, myStaffId, selectedDate) : 'none';

  return (
    <section>
      <p style={{ color: '#666', fontSize: 14 }}>
        日付をタップして希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。
      </p>
      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(requests, myStaffId, date);
          if (v === 'none') return null;
          const chip = VALUE_CHIP[v];
          return <span className={`chip ${chip.cls}`}>{chip.label}</span>;
        }}
      />
      {selectedDate && (
        <div className="picker">
          <strong style={{ alignSelf: 'center' }}>{selectedDate}：</strong>
          <button className={current === 'early' ? 'sel-early' : ''} onClick={() => setValue('early')}>早番</button>
          <button className={current === 'late' ? 'sel-late' : ''} onClick={() => setValue('late')}>遅番</button>
          <button className={current === 'both' ? 'sel-early' : ''} onClick={() => setValue('both')}>早番+遅番</button>
          <button className={current === 'off' ? 'sel-off' : ''} onClick={() => setValue('off')}>休み希望</button>
          <button onClick={() => setValue('none')}>クリア</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: ManagerMatrix を実装（新API）**

Replace `frontend/src/components/ManagerMatrix.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  year: number;
  month: number;
}

const REQUEST_MARK: Record<DayRequestValue, string> = {
  none: '', early: '早', late: '遅', both: '早遅', off: '休',
};

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, toggleAssignment } = useApp();
  const dates = getMonthDates(year, month);
  const days = dates.map((d) => Number(d.slice(8, 10)));

  return (
    <section className="matrix-wrap">
      <p style={{ color: '#666', fontSize: 14 }}>
        希望（早/遅/休）が色で見えます。希望セルをタップで割り当て・解除できます。
      </p>
      <table className="matrix">
        <thead>
          <tr>
            <th className="staff-name">スタッフ</th>
            {days.map((d) => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id}>
              <td className="staff-name">{person.name}</td>
              {dates.map((date) => {
                const req = getDayRequest(requests, person.id, date);
                const targetSlot: WorkSlot | null =
                  req === 'off' || req === 'none' ? null : req === 'late' ? 'late' : 'early';
                const assigned = targetSlot
                  ? isAssigned(assignments, date, targetSlot, person.id) : false;
                return (
                  <td
                    key={date}
                    className={`cell-btn ${assigned ? 'assigned' : ''}`}
                    onClick={() => {
                      if (!targetSlot) return;
                      void toggleAssignment(date, targetSlot, person.id, assigned);
                    }}
                  >
                    {REQUEST_MARK[req]}
                  </td>
                );
              })}
            </tr>
          ))}
          {WORK_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="staff-name">{SLOT_LABELS[slot]}人数</td>
              {dates.map((date) => {
                const count = countAssigned(assignments, date, slot);
                const level = fulfillmentLevel(count);
                return <td key={date} className={`count ${level}`}>{count}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

> 注: 旧実装にあった「両方希望の早・遅同時トグル」は、API設計（1スロットずつ）に合わせて早番のみのトグルに簡略化した（遅番に入れたい場合は別途UI拡張で対応。Phase 0 のスコープでは早番優先で割り当て）。

- [ ] **Step 4: SharedView を実装（新API）**

Replace `frontend/src/components/SharedView.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';

interface SharedViewProps {
  year: number;
  month: number;
}

export function SharedView({ year, month }: SharedViewProps) {
  const { staff, assignments } = useApp();
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';

  return (
    <section>
      <p style={{ color: '#666', fontSize: 14 }}>確定したシフトです。各日の出勤者を確認できます。</p>
      <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => (
          <>
            {WORK_SLOTS.map((slot) => {
              const a = assignments.find((x) => x.date === date && x.slot === slot);
              const names = (a?.staffIds ?? []).map(nameOf).filter(Boolean);
              if (names.length === 0) return null;
              return (
                <div key={slot} style={{ fontSize: 11, marginTop: 2 }}>
                  <span className={`chip ${slot}`}>{SLOT_LABELS[slot]}</span>{' '}
                  {names.join('、')}
                </div>
              );
            })}
          </>
        )}
      />
    </section>
  );
}
```

> 注: 同一店舗のスタッフのみ取得しているため、SharedView 側の店舗フィルタは不要になった。

- [ ] **Step 5: App を実装（認証ゲート、月の文字列⇔数値変換）**

Replace `frontend/src/App.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from './store/AppContext';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { RequestEditor } from './components/RequestEditor';
import { ManagerMatrix } from './components/ManagerMatrix';
import { SharedView } from './components/SharedView';

type Tab = 'main' | 'shared';

export function App() {
  const { me, loading, stores, storeId, month, setStoreId, setMonth, logout } = useApp();
  const [tab, setTab] = useState<Tab>('main');

  if (loading) return <div className="app"><p>読み込み中…</p></div>;
  if (!me) return <Login />;

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  function shiftMonthStr(delta: number) {
    const zero = monthNum - 1 + delta;
    const y = year + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    setMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  const isManager = me.role === 'MANAGER';

  return (
    <div className="app">
      <Header
        stores={stores}
        storeId={storeId ? String(storeId) : ''}
        onStoreChange={(id) => setStoreId(Number(id))}
        userName={me.name}
        roleLabel={isManager ? '店長' : 'スタッフ'}
        onLogout={() => void logout()}
      />

      <div className="month-nav">
        <button onClick={() => shiftMonthStr(-1)} aria-label="前の月">‹</button>
        <span className="month-title">{year}年 {monthNum}月</span>
        <button onClick={() => shiftMonthStr(1)} aria-label="次の月">›</button>
      </div>

      <div className="tabs">
        <button className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>
          {isManager ? '希望確認・割り当て' : '希望を出す'}
        </button>
        <button className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
      </div>

      {tab === 'shared'
        ? <SharedView year={year} month={monthNum} />
        : isManager
          ? <ManagerMatrix year={year} month={monthNum} />
          : <RequestEditor year={year} month={monthNum} />}
    </div>
  );
}

export default App;
```

- [ ] **Step 6: ManagerMatrix.test.tsx を新Providerに合わせて修正**

新 `AppProvider` はAPIに依存し fetch する。テストでは fetch をモックする。`frontend/src/components/ManagerMatrix.test.tsx` を以下に置き換える:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../store/AppContext';
import { ManagerMatrix } from './ManagerMatrix';

function mockApi() {
  vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const body = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
    if (url.includes('/api/auth/me')) return body({ id: 1, name: '山田（店長）', role: 'MANAGER', storeId: 1 });
    if (url.endsWith('/api/stores')) return body([{ id: 1, name: '中島店' }]);
    if (url.includes('/staff')) return body([{ id: 1, name: '山田（店長）', employmentType: '正社員', role: 'MANAGER' }]);
    if (url.includes('/requests')) return body([]);
    if (url.includes('/assignments')) return body([]);
    return body([]);
  });
}

describe('ManagerMatrix', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockApi(); });

  it('renders staff row and shift-count rows after data loads', async () => {
    render(<AppProvider><ManagerMatrix year={2026} month={7} /></AppProvider>);
    await waitFor(() => expect(screen.getByText('山田（店長）')).toBeInTheDocument());
    expect(screen.getByText('早番人数')).toBeInTheDocument();
    expect(screen.getByText('遅番人数')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 型チェック + 全フロントテスト**

Run:

```bash
cd frontend && npx tsc --noEmit && npm test
```
Expected: tsc エラーゼロ、全テスト PASS（date/requests/assignments/client/ManagerMatrix）

- [ ] **Step 8: コミット**

```bash
cd C:/Users/User/shift-app
git add frontend/src
git commit -m "feat(frontend): switch UI to server API with real login"
```

---

## Task 18: 結合確認 + ルートREADME + push

**Files:**
- Create: `README.md`（ルート）

- [ ] **Step 1: バックエンド起動**

Run（別ターミナル）:

```bash
cd backend && ./mvnw spring-boot:run
```
Expected: :8080 起動、H2 にseed投入。

- [ ] **Step 2: フロント起動して手動シナリオ確認**

Run（別ターミナル）:

```bash
cd frontend && npm run dev
```

ブラウザ（:5173）で確認:
1. ログイン画面が出る → 「中島店 スタッフ（佐藤）」= `nakashima-1` / `password` でログイン。
2. 希望を提出（早番/遅番/両方/休み）。
3. 別ブラウザ（またはシークレットウィンドウ）で `nakashima-mgr` / `password` ログイン → 店長画面に佐藤の希望が出る。
4. 店長が割り当て → 「確定シフト」タブに反映。佐藤側でも「確定シフト」に出る（＝サーバー共有成立）。
5. スタッフ画面では割り当てUIが出ない（役割で出し分け）。

確認後それぞれ Ctrl+C。

- [ ] **Step 3: ルート README を作成**

Create `C:\Users\User\shift-app\README.md`:

```markdown
# 暁夢シフト管理アプリ

ラーメン店「株式会社暁夢」向けシフト管理アプリ。React フロント + Spring Boot バックエンド構成。

## 構成
- `frontend/` … React + Vite + TypeScript
- `backend/`  … Spring Boot 3 + H2 + Spring Security
- `docs/`     … 要件・設計・実装計画

## 起動

バックエンド:
\`\`\`bash
cd backend
./mvnw spring-boot:run    # http://localhost:8080
\`\`\`

フロントエンド:
\`\`\`bash
cd frontend
npm install
npm run dev               # http://localhost:5173 （/api は backend にプロキシ）
\`\`\`

## デモ用アカウント（パスワードは全員 password）
- 店長: nakashima-mgr / nitta-mgr / hayashima-mgr
- スタッフ: nakashima-1 〜 nakashima-4 など

## テスト
\`\`\`bash
cd backend && ./mvnw test
cd frontend && npm test
\`\`\`
```

- [ ] **Step 4: コミット + push**

```bash
cd C:/Users/User/shift-app
git add README.md
git commit -m "docs: add root README for monorepo"
git push
```
Expected: `origin/feature/shift-app-1-3` に反映。

---

## Self-Review メモ

- **リポジトリ移動（frontend/）** → Task 1。✓
- **Spring Boot 雛形（Maven/H2/Security）** → Task 2,3。✓
- **データモデル**（Store/Staff/ShiftRequest/ShiftAssignment, enums） → Task 4,5。✓
- **リポジトリ** → Task 6。✓
- **Seed（3店舗・店長/スタッフ・既定パスワード）** → Task 7。✓
- **セッションCookie認証 + BCrypt + 役割** → Task 8,9。✓
- **API**（auth/me/login/logout, stores, staff, requests PUT/GET, assignments POST/DELETE/GET） → Task 9〜12。✓
- **権限**（割り当ては MANAGER のみ、403確認） → Task 8(config) + Task 12(test)。✓
- **Vite proxy** → Task 13。✓
- **APIクライアント** → Task 14。✓
- **AppContext API化（localStorage廃止）** → Task 15。✓
- **ログイン画面・役割で出し分け** → Task 16,17。✓
- **結合確認（別端末共有）・README・push** → Task 18。✓
- **型整合**: フロントの `id` は文字列（既存ロジック流用のため）、APIの数値idは変換層（toStore/toStaff/...）で String 化。`useApp` の新シグネチャ（me/staff/requests/assignments/storeId/month/各操作）を Task 15 で定義し、Task 16,17 の全コンポーネントで一貫使用。✓
- **既知の簡略化**: 「両方希望」の割り当ては早番優先の単一スロットトグル（Task 17注記）。CSRFオフ・自店舗のみ・複数店舗集約なしは設計通りスコープ外。

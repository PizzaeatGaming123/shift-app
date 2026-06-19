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

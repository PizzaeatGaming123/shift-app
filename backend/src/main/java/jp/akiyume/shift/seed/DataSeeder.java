package jp.akiyume.shift.seed;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    /** デモ用の月。フロントの初期表示月（2026-07）に合わせる。 */
    private static final int DEMO_YEAR = 2026;
    private static final int DEMO_MONTH = 7;

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;
    private final ShiftRequestRepository requestRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final DayNoteRepository dayNoteRepository;
    private final StoreNoteRepository storeNoteRepository;
    private final PasswordEncoder passwordEncoder;

    /** テストでは false にしてデモのシフト/メモを投入しない（件数検証を壊さないため）。 */
    private final boolean seedDemoShifts;

    /** シード時の初期パスワード。application.yml から注入し、本番では必ず環境変数で上書きする。 */
    private final String seedPassword;

    public DataSeeder(StoreRepository storeRepository, StaffRepository staffRepository,
                      ShiftRequestRepository requestRepository, ShiftAssignmentRepository assignmentRepository,
                      DayNoteRepository dayNoteRepository, StoreNoteRepository storeNoteRepository,
                      PasswordEncoder passwordEncoder,
                      @Value("${app.seed-demo-shifts:false}") boolean seedDemoShifts,
                      @Value("${app.seed-password:change-me-on-deploy}") String seedPassword) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
        this.requestRepository = requestRepository;
        this.assignmentRepository = assignmentRepository;
        this.dayNoteRepository = dayNoteRepository;
        this.storeNoteRepository = storeNoteRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedDemoShifts = seedDemoShifts;
        this.seedPassword = seedPassword;
    }

    private record Person(String username, String name, EmploymentType type, Role role) {}

    @Override
    public void run(String... args) {
        if (storeRepository.count() > 0) return; // 既にseed済みなら何もしない

        seedStore("中島店", List.of(
                new Person("nakashima-mgr", "西村健一", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("nakashima-1", "田中太郎", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-2", "山田花子", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-3", "岡健太郎", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-4", "貴島小夜子", EmploymentType.PART_TIME, Role.STAFF)));

        seedStore("新田店", List.of(
                new Person("nitta-mgr", "三浦誠", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("nitta-1", "加藤緑", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nitta-2", "石山豊", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nitta-3", "藤本美咲", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nitta-4", "中川大輔", EmploymentType.PART_TIME, Role.STAFF)));

        seedStore("早島店", List.of(
                new Person("hayashima-mgr", "森田優子", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("hayashima-1", "柳谷智宣", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("hayashima-2", "小早川彩", EmploymentType.PART_TIME, Role.STAFF),
                new Person("hayashima-3", "横山健司", EmploymentType.PART_TIME, Role.STAFF),
                new Person("hayashima-4", "福田直樹", EmploymentType.PART_TIME, Role.STAFF)));
    }

    private static final String[] SKILL_POOL = { "ホール", "キッチン", "レジ", "新人教育", "多言語対応" };

    private void seedStore(String storeName, List<Person> people) {
        Store store = storeRepository.save(new Store(storeName));
        String hash = passwordEncoder.encode(seedPassword);
        List<Staff> saved = new ArrayList<>();
        int idx = 0;
        for (Person p : people) {
            Staff staff = new Staff(p.username(), hash, p.name(), store, p.type(), p.role());
            staff.setRank(p.role() == Role.MANAGER ? 5 : (idx % 4) + 2); // 店長は5、スタッフは2〜5
            staff.setSkills(p.role() == Role.MANAGER
                    ? "ホール,キッチン,新人教育"
                    : SKILL_POOL[idx % SKILL_POOL.length] + "," + SKILL_POOL[(idx + 2) % SKILL_POOL.length]);
            // デモ用の時給。雇用形態でばらつかせる。
            staff.setHourlyWage(switch (p.type()) {
                case FULL_TIME -> 1800;
                case PART_TIME -> 1100;
                case ARUBAITO -> 1050;
            });
            saved.add(staffRepository.save(staff));
            idx++;
        }
        if (seedDemoShifts) {
            seedDemoShifts(store, saved);
        }
    }

    /** デモ表示用に当月の希望・割り当て・メモを投入する。 */
    private void seedDemoShifts(Store store, List<Staff> staff) {
        // staff[0] は店長。希望はスタッフ4名（index 1..4）に割り当てる。
        // 各スタッフに曜日パターンで早番/遅番/休みをばらまく。
        RequestSlot[] pattern1 = { RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY };
        RequestSlot[] pattern2 = { RequestSlot.LATE, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.OFF };
        RequestSlot[] pattern3 = { RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF, RequestSlot.LATE };
        RequestSlot[] pattern4 = { RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.LATE };
        List<RequestSlot[]> patterns = List.of(pattern1, pattern2, pattern3, pattern4);

        for (int day = 1; day <= 12; day++) {
            LocalDate date = LocalDate.of(DEMO_YEAR, DEMO_MONTH, day);
            for (int i = 1; i < staff.size(); i++) {
                Staff person = staff.get(i);
                RequestSlot slot = patterns.get(i - 1)[(day - 1) % 4];
                requestRepository.save(new ShiftRequest(person, date, slot));
                // 第1週（1..7日）は店長が希望どおりに割り当て済みにしておく
                if (day <= 7 && slot != RequestSlot.OFF) {
                    assignmentRepository.save(new ShiftAssignment(store, date, toWorkSlot(slot), person));
                }
            }
        }

        // スタッフのひとことメモ（交代・応援依頼など）
        Staff s1 = staff.get(1);
        Staff s2 = staff.get(2);
        Staff s3 = staff.get(3);
        dayNoteRepository.save(new DayNote(s1, LocalDate.of(DEMO_YEAR, DEMO_MONTH, 3), "早番大丈夫です！"));
        dayNoteRepository.save(new DayNote(s2, LocalDate.of(DEMO_YEAR, DEMO_MONTH, 2), "この日、応援お願いします"));
        dayNoteRepository.save(new DayNote(s3, LocalDate.of(DEMO_YEAR, DEMO_MONTH, 4), "変わってくれませんか？"));

        // 店舗メモ
        storeNoteRepository.save(new StoreNote(store, LocalDate.of(DEMO_YEAR, DEMO_MONTH, 1), "ポイント2倍デー"));
        storeNoteRepository.save(new StoreNote(store, LocalDate.of(DEMO_YEAR, DEMO_MONTH, 8), "週末は混雑予想"));
    }

    private static WorkSlot toWorkSlot(RequestSlot slot) {
        return switch (slot) {
            case EARLY -> WorkSlot.EARLY;
            case LATE -> WorkSlot.LATE;
            case ANY -> WorkSlot.EARLY;
            case OFF -> throw new IllegalArgumentException("OFF は割り当てできません");
        };
    }
}

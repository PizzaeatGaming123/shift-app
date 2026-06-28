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

    /** デモ用の年。希望シフトは 7〜9 月に投入する（フロント既定の翌月＝7月に合わせる）。 */
    private static final int DEMO_YEAR = 2026;

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
        seedStore("中島店", List.of(
                new Person("nakashima-mgr", "西村健一", EmploymentType.FULL_TIME, Role.MANAGER),
                new Person("nakashima-1", "田中太郎", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-2", "山田花子", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-3", "岡健太郎", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-4", "貴島小夜子", EmploymentType.PART_TIME, Role.STAFF),
                // 15 人表示の確認用に追加したデモスタッフ。
                new Person("nakashima-5", "佐藤一郎", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-6", "鈴木二郎", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-7", "高橋三郎", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-8", "伊藤四郎", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-9", "渡辺五郎", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-10", "山本六美", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-11", "中村七海", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-12", "小林八重", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-13", "加納九子", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-14", "吉田十和", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-15", "斉藤光", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-16", "松本葵", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-17", "井上陸", EmploymentType.PART_TIME, Role.STAFF),
                new Person("nakashima-18", "木村結衣", EmploymentType.FULL_TIME, Role.STAFF),
                new Person("nakashima-19", "林希美", EmploymentType.PART_TIME, Role.STAFF)));

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

    private void seedStore(String storeName, List<Person> people) {
        Store store = storeRepository.findByName(storeName)
                .orElseGet(() -> storeRepository.save(new Store(storeName)));
        String hash = passwordEncoder.encode(seedPassword);
        List<Staff> saved = new ArrayList<>();
        for (Person p : people) {
            Staff staff = staffRepository.findByUsername(p.username())
                    .orElseGet(() -> new Staff(p.username(), hash, p.name(), store, p.type(), p.role()));
            // デモ用の時給。雇用形態でばらつかせる。
            staff.setHourlyWage(switch (p.type()) {
                case FULL_TIME -> 1800;
                case PART_TIME -> 1100;
            });
            // デモ用の月労働時間上限。パートは扶養範囲内の 87h、正社員は制限なし。
            staff.setMonthlyHourLimit(switch (p.type()) {
                case FULL_TIME -> null;
                case PART_TIME -> 87;
            });
            saved.add(staffRepository.save(staff));
        }
        // 希望は 7〜9 月の3か月分を投入対象にする（割当はゼロのまま）。
        LocalDate from = LocalDate.of(DEMO_YEAR, 7, 1);
        LocalDate to = LocalDate.of(DEMO_YEAR, 9, 30);
        boolean hasDemoShifts = !requestRepository.findByStaff_Store_IdAndDateBetween(store.getId(), from, to).isEmpty()
                || !assignmentRepository.findByStore_IdAndDateBetween(store.getId(), from, to).isEmpty();
        if (seedDemoShifts && !hasDemoShifts) {
            seedDemoShifts(store, saved);
        }
    }

    /** デモ表示用に 7〜9 月分の希望（全員提出済み）とメモを投入する。割当は作らない。 */
    private void seedDemoShifts(Store store, List<Staff> staff) {
        // 7日サイクルの曜日パターンを4種類用意し、staff index でローテートして
        // 「全員違うけど現実的な希望分布」になるようにする。
        RequestSlot[] pattern1 = { RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF };
        RequestSlot[] pattern2 = { RequestSlot.LATE, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF };
        RequestSlot[] pattern3 = { RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF, RequestSlot.LATE, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY };
        RequestSlot[] pattern4 = { RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.LATE };
        List<RequestSlot[]> patterns = List.of(pattern1, pattern2, pattern3, pattern4);

        for (int month = 7; month <= 9; month++) {
            int lengthOfMonth = LocalDate.of(DEMO_YEAR, month, 1).lengthOfMonth();
            for (int day = 1; day <= lengthOfMonth; day++) {
                LocalDate date = LocalDate.of(DEMO_YEAR, month, day);
                // index 0 は店長（MANAGER）。1 以降がスタッフ。
                for (int i = 1; i < staff.size(); i++) {
                    Staff person = staff.get(i);
                    RequestSlot[] pattern = patterns.get((i - 1) % patterns.size());
                    RequestSlot slot = pattern[(day - 1) % pattern.length];
                    requestRepository.save(new ShiftRequest(person, date, slot));
                }
            }
        }

        // スタッフのひとことメモ（雰囲気付け。7 月のみ）
        if (staff.size() > 3) {
            Staff s1 = staff.get(1);
            Staff s2 = staff.get(2);
            Staff s3 = staff.get(3);
            dayNoteRepository.save(new DayNote(s1, LocalDate.of(DEMO_YEAR, 7, 3), "早番大丈夫です！"));
            dayNoteRepository.save(new DayNote(s2, LocalDate.of(DEMO_YEAR, 7, 2), "この日、応援お願いします"));
            dayNoteRepository.save(new DayNote(s3, LocalDate.of(DEMO_YEAR, 7, 4), "変わってくれませんか？"));
        }

        // 店舗メモ
        storeNoteRepository.save(new StoreNote(store, LocalDate.of(DEMO_YEAR, 7, 1), "ポイント2倍デー"));
        storeNoteRepository.save(new StoreNote(store, LocalDate.of(DEMO_YEAR, 7, 8), "週末は混雑予想"));
    }

}

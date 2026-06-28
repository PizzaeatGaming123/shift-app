package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.EmploymentType;
import jp.akiyume.shift.domain.RequestSlot;
import jp.akiyume.shift.domain.Role;
import jp.akiyume.shift.domain.ShiftRequest;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.domain.Store;
import jp.akiyume.shift.repo.ShiftRequestRepository;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class StaffService {

    private final StaffRepository staffRepository;
    private final StoreRepository storeRepository;
    private final ShiftRequestRepository requestRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;
    private final boolean seedDemoShifts;

    /** デモ希望を仕込む年。フロントの既定（翌月＝2026-07）に合わせる。 */
    private static final int DEMO_YEAR = 2026;

    /** 4 種類の曜日パターン。新規スタッフは店舗の既存スタッフ数を元にローテートして当てる。 */
    private static final List<RequestSlot[]> PATTERNS = List.of(
            new RequestSlot[]{ RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF },
            new RequestSlot[]{ RequestSlot.LATE, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF },
            new RequestSlot[]{ RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF, RequestSlot.LATE, RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY },
            new RequestSlot[]{ RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.LATE }
    );

    public StaffService(StaffRepository staffRepository, StoreRepository storeRepository,
                        ShiftRequestRepository requestRepository,
                        PasswordEncoder passwordEncoder,
                        @Value("${app.seed-password:change-me-on-deploy}") String seedPassword,
                        @Value("${app.seed-demo-shifts:false}") boolean seedDemoShifts) {
        this.staffRepository = staffRepository;
        this.storeRepository = storeRepository;
        this.requestRepository = requestRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
        this.seedDemoShifts = seedDemoShifts;
    }

    /** スタッフの時給・月労働時間上限を更新する。null フィールドは更新しない。 */
    @Transactional
    public void updateStaff(Long id, Integer hourlyWage, Integer monthlyHourLimit) {
        Staff staff = staffRepository.findById(id).orElseThrow();
        if (hourlyWage != null) {
            if (hourlyWage < 0 || hourlyWage > 100000) {
                throw new IllegalArgumentException("hourlyWage out of range");
            }
            staff.setHourlyWage(hourlyWage);
        }
        if (monthlyHourLimit != null) {
            if (monthlyHourLimit < 0 || monthlyHourLimit > 1000) {
                throw new IllegalArgumentException("monthlyHourLimit out of range");
            }
            staff.setMonthlyHourLimit(monthlyHourLimit);
        }
        staffRepository.save(staff);
    }

    /** スタッフ／管理者を新規登録する。初期パスワードは app.seed-password、ユーザー名は呼び出し側指定。 */
    @Transactional
    public Staff create(Long storeId, String name, String employmentType, String role, String username) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("name is required");
        }
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("username is required");
        }
        String normalized = username.trim();
        if (!normalized.matches("[a-zA-Z0-9_-]+")) {
            throw new IllegalArgumentException("username must contain only [A-Za-z0-9_-]");
        }
        if (staffRepository.findByUsername(normalized).isPresent()) {
            throw new IllegalArgumentException("duplicate username: " + normalized);
        }
        Store store = storeRepository.findById(storeId).orElseThrow();
        EmploymentType type = switch (employmentType == null ? "" : employmentType) {
            case "正社員" -> EmploymentType.FULL_TIME;
            default -> EmploymentType.PART_TIME;
        };
        Role r = "MANAGER".equalsIgnoreCase(role) ? Role.MANAGER : Role.STAFF;
        String hash = passwordEncoder.encode(seedPassword);
        Staff staff = new Staff(normalized, hash, name.trim(), store, type, r);
        Staff saved = staffRepository.save(staff);
        // デモ環境では新規スタッフ（店長以外）にも 7〜9 月の希望を自動投入する。
        // これで毎回 backend を再起動せずに「全員提出済み」状態を維持できる。
        if (seedDemoShifts && r == Role.STAFF) {
            seedDemoRequestsFor(saved, storeId);
        }
        return saved;
    }

    /** 新規スタッフに 7〜9 月の希望を 1 か月分ずつ投入する。既存があればその月は飛ばす。 */
    private void seedDemoRequestsFor(Staff person, Long storeId) {
        // 同じ店舗の既存スタッフ数で曜日パターンをローテートし、毎回違うパターンになるようにする。
        long staffCount = staffRepository.findByStoreId(storeId).stream()
                .filter(s -> s.getRole() == Role.STAFF)
                .count();
        RequestSlot[] pattern = PATTERNS.get((int) ((staffCount - 1 + PATTERNS.size()) % PATTERNS.size()));
        for (int month = 7; month <= 9; month++) {
            LocalDate firstOfMonth = LocalDate.of(DEMO_YEAR, month, 1);
            LocalDate lastOfMonth = firstOfMonth.withDayOfMonth(firstOfMonth.lengthOfMonth());
            boolean alreadyHas = requestRepository
                    .findByStaff_Store_IdAndDateBetween(storeId, firstOfMonth, lastOfMonth)
                    .stream()
                    .anyMatch(r -> r.getStaff().getId().equals(person.getId()));
            if (alreadyHas) continue;
            int lengthOfMonth = firstOfMonth.lengthOfMonth();
            for (int day = 1; day <= lengthOfMonth; day++) {
                LocalDate date = LocalDate.of(DEMO_YEAR, month, day);
                RequestSlot slot = pattern[(day - 1) % pattern.length];
                requestRepository.save(new ShiftRequest(person, date, slot));
            }
        }
    }
}

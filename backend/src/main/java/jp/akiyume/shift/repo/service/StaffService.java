package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.EmploymentType;
import jp.akiyume.shift.domain.Role;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.domain.Store;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {

    private final StaffRepository staffRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public StaffService(StaffRepository staffRepository, StoreRepository storeRepository,
                        PasswordEncoder passwordEncoder,
                        @Value("${app.seed-password:change-me-on-deploy}") String seedPassword) {
        this.staffRepository = staffRepository;
        this.storeRepository = storeRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
    }

    /** スタッフのランク（1〜5）・スキル・時給を更新する。null フィールドは更新しない。 */
    @Transactional
    public void updateRankSkills(Long id, Integer rank, String skills, Integer hourlyWage) {
        Staff staff = staffRepository.findById(id).orElseThrow();
        if (rank != null) {
            staff.setRank(Math.max(1, Math.min(5, rank)));
        }
        if (skills != null) {
            staff.setSkills(skills.trim());
        }
        if (hourlyWage != null) {
            if (hourlyWage < 0 || hourlyWage > 100000) {
                throw new IllegalArgumentException("hourlyWage out of range");
            }
            staff.setHourlyWage(hourlyWage);
        }
        staffRepository.save(staff);
    }

    /** スタッフ／管理者を新規登録する。初期パスワードは app.seed-password。 */
    @Transactional
    public Staff create(Long storeId, String name, String employmentType, String role) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("name is required");
        }
        Store store = storeRepository.findById(storeId).orElseThrow();
        EmploymentType type = switch (employmentType == null ? "" : employmentType) {
            case "正社員" -> EmploymentType.FULL_TIME;
            case "アルバイト" -> EmploymentType.ARUBAITO;
            default -> EmploymentType.PART_TIME;
        };
        Role r = "MANAGER".equalsIgnoreCase(role) ? Role.MANAGER : Role.STAFF;
        String username = "u" + storeId + "-" + System.currentTimeMillis();
        String hash = passwordEncoder.encode(seedPassword);
        Staff staff = new Staff(username, hash, name.trim(), store, type, r);
        staff.setRank(r == Role.MANAGER ? 5 : 3);
        return staffRepository.save(staff);
    }
}

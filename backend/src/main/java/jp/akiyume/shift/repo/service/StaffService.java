package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.EmploymentType;
import jp.akiyume.shift.domain.Role;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.domain.Store;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {

    private final StaffRepository staffRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffService(StaffRepository staffRepository, StoreRepository storeRepository,
                        PasswordEncoder passwordEncoder) {
        this.staffRepository = staffRepository;
        this.storeRepository = storeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** スタッフのランク（1〜5）とスキルを更新する。 */
    @Transactional
    public void updateRankSkills(Long id, Integer rank, String skills) {
        Staff staff = staffRepository.findById(id).orElseThrow();
        if (rank != null) {
            staff.setRank(Math.max(1, Math.min(5, rank)));
        }
        staff.setSkills(skills == null ? null : skills.trim());
        staffRepository.save(staff);
    }

    /** スタッフ／管理者を新規登録する。初期パスワードは "password"。 */
    @Transactional
    public Staff create(Long storeId, String name, String employmentType, String role) {
        Store store = storeRepository.findById(storeId).orElseThrow();
        EmploymentType type = "正社員".equals(employmentType) ? EmploymentType.FULL_TIME : EmploymentType.PART_TIME;
        Role r = "MANAGER".equalsIgnoreCase(role) ? Role.MANAGER : Role.STAFF;
        String username = "u" + storeId + "-" + System.currentTimeMillis();
        String hash = passwordEncoder.encode("password");
        Staff staff = new Staff(username, hash, name.trim(), store, type, r);
        staff.setRank(r == Role.MANAGER ? 5 : 3);
        return staffRepository.save(staff);
    }
}

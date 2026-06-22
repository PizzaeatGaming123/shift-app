package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {

    private final StaffRepository staffRepository;

    public StaffService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
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
}

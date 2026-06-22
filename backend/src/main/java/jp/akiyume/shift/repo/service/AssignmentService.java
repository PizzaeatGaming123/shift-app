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

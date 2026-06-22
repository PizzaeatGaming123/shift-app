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

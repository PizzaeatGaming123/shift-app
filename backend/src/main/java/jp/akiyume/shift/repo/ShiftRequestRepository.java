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

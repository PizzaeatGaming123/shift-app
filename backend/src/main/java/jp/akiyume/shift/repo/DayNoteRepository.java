package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.DayNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DayNoteRepository extends JpaRepository<DayNote, Long> {
    List<DayNote> findByStaff_Store_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    Optional<DayNote> findByStaff_IdAndDate(Long staffId, LocalDate date);
}

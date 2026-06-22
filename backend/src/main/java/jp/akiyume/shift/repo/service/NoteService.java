package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.DayNote;
import jp.akiyume.shift.domain.Recruitment;
import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.domain.Store;
import jp.akiyume.shift.domain.StoreNote;
import jp.akiyume.shift.repo.DayNoteRepository;
import jp.akiyume.shift.repo.RecruitmentRepository;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreNoteRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class NoteService {

    private final DayNoteRepository dayNoteRepository;
    private final StoreNoteRepository storeNoteRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final StaffRepository staffRepository;
    private final StoreRepository storeRepository;

    public NoteService(DayNoteRepository dayNoteRepository, StoreNoteRepository storeNoteRepository,
                       RecruitmentRepository recruitmentRepository,
                       StaffRepository staffRepository, StoreRepository storeRepository) {
        this.dayNoteRepository = dayNoteRepository;
        this.storeNoteRepository = storeNoteRepository;
        this.recruitmentRepository = recruitmentRepository;
        this.staffRepository = staffRepository;
        this.storeRepository = storeRepository;
    }

    /** 自分のひとことを upsert。空文字なら削除。更新後（または null）を返す。 */
    @Transactional
    public DayNote setDayNote(String username, LocalDate date, String text) {
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        Optional<DayNote> existing = dayNoteRepository.findByStaff_IdAndDate(staff.getId(), date);
        if (isBlank(text)) {
            existing.ifPresent(dayNoteRepository::delete);
            return null;
        }
        String trimmed = trim(text);
        DayNote note = existing.map(n -> { n.setText(trimmed); return n; })
                .orElseGet(() -> new DayNote(staff, date, trimmed));
        return dayNoteRepository.save(note);
    }

    public List<DayNote> findDayNotesByStoreMonth(Long storeId, LocalDate from, LocalDate to) {
        return dayNoteRepository.findByStaff_Store_IdAndDateBetween(storeId, from, to);
    }

    /** 店舗メモを upsert。空文字なら削除。更新後（または null）を返す。 */
    @Transactional
    public StoreNote setStoreNote(Long storeId, LocalDate date, String text) {
        Optional<StoreNote> existing = storeNoteRepository.findByStore_IdAndDate(storeId, date);
        if (isBlank(text)) {
            existing.ifPresent(storeNoteRepository::delete);
            return null;
        }
        String trimmed = trim(text);
        StoreNote note = existing.map(n -> { n.setText(trimmed); return n; })
                .orElseGet(() -> {
                    Store store = storeRepository.findById(storeId).orElseThrow();
                    return new StoreNote(store, date, trimmed);
                });
        return storeNoteRepository.save(note);
    }

    public List<StoreNote> findStoreNotesByMonth(Long storeId, LocalDate from, LocalDate to) {
        return storeNoteRepository.findByStore_IdAndDateBetween(storeId, from, to);
    }

    /** 追加募集を upsert。空文字なら削除。更新後（または null）を返す。 */
    @Transactional
    public Recruitment setRecruitment(Long storeId, LocalDate date, String message) {
        Optional<Recruitment> existing = recruitmentRepository.findByStore_IdAndDate(storeId, date);
        if (isBlank(message)) {
            existing.ifPresent(recruitmentRepository::delete);
            return null;
        }
        String trimmed = trim(message);
        Recruitment rec = existing.map(r -> { r.setMessage(trimmed); return r; })
                .orElseGet(() -> {
                    Store store = storeRepository.findById(storeId).orElseThrow();
                    return new Recruitment(store, date, trimmed);
                });
        return recruitmentRepository.save(rec);
    }

    public List<Recruitment> findRecruitmentsByMonth(Long storeId, LocalDate from, LocalDate to) {
        return recruitmentRepository.findByStore_IdAndDateBetween(storeId, from, to);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String trim(String s) {
        String t = s.trim();
        return t.length() > 200 ? t.substring(0, 200) : t;
    }
}

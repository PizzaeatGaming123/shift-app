package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.ShiftAssignmentRepository;
import jp.akiyume.shift.repo.ShiftRequestRepository;
import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.DayNoteRepository;
import jp.akiyume.shift.web.dto.SubmitRequestEntry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class RequestService {

    private final ShiftRequestRepository requestRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final StaffRepository staffRepository;
    private final DayNoteRepository dayNoteRepository;

    public RequestService(ShiftRequestRepository requestRepository,
                          ShiftAssignmentRepository assignmentRepository,
                          StaffRepository staffRepository,
                          DayNoteRepository dayNoteRepository) {
        this.requestRepository = requestRepository;
        this.assignmentRepository = assignmentRepository;
        this.staffRepository = staffRepository;
        this.dayNoteRepository = dayNoteRepository;
    }

    /** 希望が「休み」になった日は既存の割当（早番/遅番）も解除する。 */
    private void clearAssignmentsIfOff(Staff staff, LocalDate date, RequestSlot slot) {
        if (slot != RequestSlot.OFF) return;
        assignmentRepository.findByStaff_IdAndDate(staff.getId(), date)
                .forEach(assignmentRepository::delete);
    }

    /** その日の希望をまるごと置き換える（none/early/late/off）。更新後の当日レコードを返す。 */
    @Transactional
    public List<ShiftRequest> setDayRequest(String username, LocalDate date, String value) {
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);
        // Hibernate のアクション順序は既定で INSERT → DELETE のため、同じ (staff_id, date, slot)
        // を続けて save すると先に INSERT が走って一意制約に衝突する。明示 flush で DELETE を先に流す。
        requestRepository.flush();

        List<ShiftRequest> added = new ArrayList<>();
        switch (value) {
            case "early" -> added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
            case "late" -> added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
            case "any" -> added.add(new ShiftRequest(staff, date, RequestSlot.ANY));
            case "off" -> added.add(new ShiftRequest(staff, date, RequestSlot.OFF));
            case "none" -> { /* 何も追加しない */ }
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unknown request value");
        }
        if ("off".equals(value)) {
            clearAssignmentsIfOff(staff, date, RequestSlot.OFF);
        }
        return requestRepository.saveAll(added);
    }

    /** スマホ提出画面の希望とメモを一度のトランザクションで保存する。 */
    @Transactional
    public void submit(String username, List<SubmitRequestEntry> entries) {
        if (entries == null || entries.isEmpty() || entries.size() > 31) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid submission size");
        }
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        Set<LocalDate> seen = new HashSet<>();
        // 一応の sanity check のみ（明らかに不正な極端年だけ弾く）。
        // 厳しい期間バリデーションはサーバ時計に依存して誤検知するため、提出期間管理は別レイヤに任せる。
        LocalDate minDate = LocalDate.of(2000, 1, 1);
        LocalDate maxDate = LocalDate.of(2099, 12, 31);
        for (SubmitRequestEntry entry : entries) {
            LocalDate date;
            try {
                date = LocalDate.parse(entry.date());
            } catch (RuntimeException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid date");
            }
            if (date.isBefore(minDate) || date.isAfter(maxDate)) {
                throw new ResponseStatusException(BAD_REQUEST, "Date out of allowed range");
            }
            if (!seen.add(date)) {
                throw new ResponseStatusException(BAD_REQUEST, "Duplicate date");
            }

            requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);
            // 同上：DELETE を先に確定させてから save しないと一意制約 (staff_id, date, slot) で 500 になる。
            requestRepository.flush();
            RequestSlot slot = switch (entry.value()) {
                case "early" -> RequestSlot.EARLY;
                case "late" -> RequestSlot.LATE;
                case "any" -> RequestSlot.ANY;
                case "off" -> RequestSlot.OFF;
                case "none" -> null;
                default -> throw new ResponseStatusException(BAD_REQUEST, "Unknown request value");
            };
            if (slot != null) {
                boolean hasTime = slot != RequestSlot.OFF && slot != RequestSlot.ANY;
                String startTime = hasTime ? normalizeTime(entry.startTime()) : null;
                String endTime = hasTime ? normalizeTime(entry.endTime()) : null;
                if (hasTime) validateRange(startTime, endTime);
                ShiftRequest request = new ShiftRequest(staff, date, slot, startTime, endTime);
                request.setStatus(RequestStatus.SUBMITTED);
                requestRepository.save(request);
                clearAssignmentsIfOff(staff, date, slot);
            }

            var existingNote = dayNoteRepository.findByStaff_IdAndDate(staff.getId(), date);
            String note = entry.note() == null ? "" : entry.note().trim();
            if (note.length() > 200) {
                throw new ResponseStatusException(BAD_REQUEST, "Note is too long");
            }
            if (note.isEmpty()) {
                existingNote.ifPresent(dayNoteRepository::delete);
            } else {
                DayNote dayNote = existingNote.map(n -> {
                    n.setText(note);
                    return n;
                }).orElseGet(() -> new DayNote(staff, date, note));
                dayNoteRepository.save(dayNote);
            }
        }
    }

    public List<ShiftRequest> findByStoreAndMonth(Long storeId, LocalDate from, LocalDate to) {
        return requestRepository.findByStaff_Store_IdAndDateBetween(storeId, from, to);
    }

    private static String normalizeTime(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (!normalized.matches("(?:[01]\\d|2[0-3]):[0-5]\\d|24:00")) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid time");
        }
        return normalized;
    }

    private static void validateRange(String startTime, String endTime) {
        if (startTime == null || endTime == null || "24:00".equals(startTime)
                || toMinutes(endTime) <= toMinutes(startTime)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid time range");
        }
    }

    private static int toMinutes(String value) {
        if ("24:00".equals(value)) return 24 * 60;
        String[] parts = value.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }
}

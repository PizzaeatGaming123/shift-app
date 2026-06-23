package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
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
    private final StaffRepository staffRepository;
    private final DayNoteRepository dayNoteRepository;

    public RequestService(ShiftRequestRepository requestRepository, StaffRepository staffRepository,
                          DayNoteRepository dayNoteRepository) {
        this.requestRepository = requestRepository;
        this.staffRepository = staffRepository;
        this.dayNoteRepository = dayNoteRepository;
    }

    /** その日の希望をまるごと置き換える（none/early/late/off）。更新後の当日レコードを返す。 */
    @Transactional
    public List<ShiftRequest> setDayRequest(String username, LocalDate date, String value) {
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);

        List<ShiftRequest> added = new ArrayList<>();
        switch (value) {
            case "early" -> added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
            case "late" -> added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
            case "off" -> added.add(new ShiftRequest(staff, date, RequestSlot.OFF));
            case "none" -> { /* 何も追加しない */ }
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unknown request value");
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
        for (SubmitRequestEntry entry : entries) {
            LocalDate date;
            try {
                date = LocalDate.parse(entry.date());
            } catch (RuntimeException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid date");
            }
            if (!seen.add(date)) {
                throw new ResponseStatusException(BAD_REQUEST, "Duplicate date");
            }

            requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);
            RequestSlot slot = switch (entry.value()) {
                case "early" -> RequestSlot.EARLY;
                case "late" -> RequestSlot.LATE;
                case "off" -> RequestSlot.OFF;
                case "none" -> null;
                default -> throw new ResponseStatusException(BAD_REQUEST, "Unknown request value");
            };
            if (slot != null) {
                String startTime = slot == RequestSlot.OFF ? null : normalizeTime(entry.startTime());
                String endTime = slot == RequestSlot.OFF ? null : normalizeTime(entry.endTime());
                if (slot != RequestSlot.OFF) validateRange(startTime, endTime);
                requestRepository.save(new ShiftRequest(staff, date, slot, startTime, endTime));
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

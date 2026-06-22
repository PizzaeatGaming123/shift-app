package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.*;
import jp.akiyume.shift.repo.ShiftRequestRepository;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RequestService {

    private final ShiftRequestRepository requestRepository;
    private final StaffRepository staffRepository;

    public RequestService(ShiftRequestRepository requestRepository, StaffRepository staffRepository) {
        this.requestRepository = requestRepository;
        this.staffRepository = staffRepository;
    }

    /** その日の希望をまるごと置き換える（none/early/mid/late/off）。更新後の当日レコードを返す。 */
    @Transactional
    public List<ShiftRequest> setDayRequest(String username, LocalDate date, String value) {
        Staff staff = staffRepository.findByUsername(username).orElseThrow();
        requestRepository.deleteByStaff_IdAndDate(staff.getId(), date);

        List<ShiftRequest> added = new ArrayList<>();
        switch (value) {
            case "early" -> added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
            case "mid" -> added.add(new ShiftRequest(staff, date, RequestSlot.MID));
            case "late" -> added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
            case "off" -> added.add(new ShiftRequest(staff, date, RequestSlot.OFF));
            case "none" -> { /* 何も追加しない */ }
            default -> throw new IllegalArgumentException("Unknown value: " + value);
        }
        return requestRepository.saveAll(added);
    }

    public List<ShiftRequest> findByStoreAndMonth(Long storeId, LocalDate from, LocalDate to) {
        return requestRepository.findByStaff_Store_IdAndDateBetween(storeId, from, to);
    }
}

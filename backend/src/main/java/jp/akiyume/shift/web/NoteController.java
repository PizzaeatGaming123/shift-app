package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.service.NoteService;
import jp.akiyume.shift.web.dto.DayNoteDto;
import jp.akiyume.shift.web.dto.SetDayNoteBody;
import jp.akiyume.shift.web.dto.SetStoreNoteBody;
import jp.akiyume.shift.web.dto.StoreNoteDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PutMapping("/day-notes")
    public void setDayNote(@RequestBody SetDayNoteBody body, Authentication auth) {
        noteService.setDayNote(auth.getName(), LocalDate.parse(body.date()), body.text());
    }

    @GetMapping("/stores/{storeId}/day-notes")
    public List<DayNoteDto> dayNotes(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return noteService.findDayNotesByStoreMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(DayNoteDto::from).toList();
    }

    @PutMapping("/stores/{storeId}/store-notes")
    public void setStoreNote(@PathVariable Long storeId, @RequestBody SetStoreNoteBody body) {
        noteService.setStoreNote(storeId, LocalDate.parse(body.date()), body.text());
    }

    @GetMapping("/stores/{storeId}/store-notes")
    public List<StoreNoteDto> storeNotes(@PathVariable Long storeId, @RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        return noteService.findStoreNotesByMonth(storeId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(StoreNoteDto::from).toList();
    }
}

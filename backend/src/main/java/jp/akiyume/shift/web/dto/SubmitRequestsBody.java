package jp.akiyume.shift.web.dto;

import java.util.List;

public record SubmitRequestsBody(List<SubmitRequestEntry> entries) {}

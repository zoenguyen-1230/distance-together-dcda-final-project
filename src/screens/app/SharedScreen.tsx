import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MultiSelectDropdown } from "../../components/ui/MultiSelectDropdown";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { CalendarRangePicker } from "../../components/ui/CalendarRangePicker";
import { SectionCard } from "../../components/ui/SectionCard";
import {
  displayDateToInputValue,
  formatDateRange,
  getMonthNames,
  inputValueToDisplayDate,
  parseDateValue,
} from "../../lib/dateHelpers";
import { pickImageFromDevice } from "../../lib/pickImageFromDevice";
import { useAppData } from "../../providers/AppDataProvider";
import { palette } from "../../theme/palette";
import { CalendarEvent, JournalEntry, TimeCapsule } from "../../types";

const monthNames = getMonthNames();

function getJournalDateParts(date: string) {
  const [month = "", day = ""] = date.split(" ");

  return {
    month: month.slice(0, 3).toUpperCase(),
    day: day.replace(",", ""),
  };
}

function calendarEventToDateValue(event: CalendarEvent) {
  if (event.dateValue) {
    return event.dateValue;
  }

  const monthIndex = monthNames.findIndex(
    (month) => month.slice(0, 3).toUpperCase() === event.month.toUpperCase()
  );

  if (monthIndex < 0) {
    return "";
  }

  return `2026-${String(monthIndex + 1).padStart(2, "0")}-${String(event.day).padStart(2, "0")}`;
}

export function SharedScreen() {
  const {
    journalEntries,
    setJournalEntries,
    timeCapsules,
    setTimeCapsules,
    calendarEvents,
    setCalendarEvents,
    connections,
  } = useAppData();
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [entryDraftDateValue, setEntryDraftDateValue] = useState("");
  const [entryDraftTitle, setEntryDraftTitle] = useState("");
  const [entryDraftBody, setEntryDraftBody] = useState("");
  const [entryDraftParticipantIds, setEntryDraftParticipantIds] = useState<string[]>([]);
  const [draftPhotos, setDraftPhotos] = useState<Record<string, string>>({});
  const [selectedCapsuleId, setSelectedCapsuleId] = useState("");
  const [capsuleDraftTitle, setCapsuleDraftTitle] = useState("");
  const [capsuleDraftFrom, setCapsuleDraftFrom] = useState("");
  const [capsuleDraftBody, setCapsuleDraftBody] = useState("");
  const [capsuleDraftUnlockMode, setCapsuleDraftUnlockMode] = useState<"date" | "anytime">("date");
  const [capsuleDraftUnlockDateValue, setCapsuleDraftUnlockDateValue] = useState("");
  const [capsuleDraftParticipantIds, setCapsuleDraftParticipantIds] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventDraftDateValue, setEventDraftDateValue] = useState("");
  const [eventDraftTitle, setEventDraftTitle] = useState("");
  const [eventDraftDetail, setEventDraftDetail] = useState("");
  const [eventDraftParticipantIds, setEventDraftParticipantIds] = useState<string[]>([]);
  const [entryCalendarMonth, setEntryCalendarMonth] = useState(new Date(2026, 3, 1, 12, 0, 0));
  const [capsuleCalendarMonth, setCapsuleCalendarMonth] = useState(new Date(2026, 3, 1, 12, 0, 0));
  const [eventCalendarMonth, setEventCalendarMonth] = useState(new Date(2026, 3, 1, 12, 0, 0));
  const [openCalendarPicker, setOpenCalendarPicker] = useState<"entry" | "capsule" | "event" | null>(null);
  const [openCapsuleModeMenu, setOpenCapsuleModeMenu] = useState(false);
  const [openedCapsuleIds, setOpenedCapsuleIds] = useState<string[]>([]);
  const [openParticipantMenu, setOpenParticipantMenu] = useState<"entry" | "capsule" | "event" | null>(null);

  const entries = journalEntries;
  const getParticipantNames = (participantIds?: string[]) =>
    connections
      .filter((connection) => (participantIds ?? []).includes(connection.id))
      .map((connection) => connection.name);

  const toggleDraftParticipant = (
    draftType: "entry" | "capsule" | "event",
    connectionId: string
  ) => {
    const updater = (current: string[]) =>
      current.includes(connectionId)
        ? current.filter((item) => item !== connectionId)
        : [...current, connectionId];

    if (draftType === "entry") {
      setEntryDraftParticipantIds(updater);
      return;
    }

    if (draftType === "capsule") {
      setCapsuleDraftParticipantIds(updater);
      return;
    }

    setEventDraftParticipantIds(updater);
  };

  const resetEntryDraft = () => {
    setSelectedEntryId("");
    setEntryDraftDateValue("");
    setEntryDraftTitle("");
    setEntryDraftBody("");
    setEntryDraftParticipantIds([]);
  };

  const loadEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    const nextDateValue = displayDateToInputValue(entry.date);
    setEntryDraftDateValue(nextDateValue);
    setEntryDraftTitle(entry.title);
    setEntryDraftBody(entry.body);
    setEntryDraftParticipantIds(entry.participantIds ?? []);
    const nextDate = parseDateValue(nextDateValue);
    if (nextDate) {
      setEntryCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12, 0, 0));
    }
  };

  const saveEntry = () => {
    const date = entryDraftDateValue.trim() ? inputValueToDisplayDate(entryDraftDateValue.trim()) : "";
    const title = entryDraftTitle.trim();
    const body = entryDraftBody.trim();

    if (!date || !title || !body) {
      return;
    }

    const existingEntry = journalEntries.find((entry) => entry.id === selectedEntryId);
    const nextEntry: JournalEntry = {
      id: existingEntry?.id ?? `journal-${Date.now()}`,
      date,
      title,
      body,
      photos: existingEntry?.photos ?? [],
      participantIds: entryDraftParticipantIds,
    };

    if (existingEntry) {
      setJournalEntries((current) =>
        current.map((entry) => (entry.id === existingEntry.id ? nextEntry : entry))
      );
    } else {
      setJournalEntries((current) => [nextEntry, ...current]);
      setDraftPhotos((current) => ({ ...current, [nextEntry.id]: "" }));
    }

    resetEntryDraft();
  };

  const removeEntry = (entryId: string) => {
    setJournalEntries((current) => current.filter((entry) => entry.id !== entryId));
    if (selectedEntryId === entryId) {
      resetEntryDraft();
    }
  };

  const resetCapsuleDraft = () => {
    setSelectedCapsuleId("");
    setCapsuleDraftTitle("");
    setCapsuleDraftFrom("");
    setCapsuleDraftBody("");
    setCapsuleDraftUnlockMode("date");
    setCapsuleDraftUnlockDateValue("");
    setCapsuleDraftParticipantIds([]);
  };

  const loadCapsule = (capsule: TimeCapsule) => {
    setSelectedCapsuleId(capsule.id);
    setCapsuleDraftTitle(capsule.title);
    setCapsuleDraftFrom(capsule.from);
    setCapsuleDraftBody(capsule.body);
    setCapsuleDraftUnlockMode(capsule.unlockMode);
    setCapsuleDraftParticipantIds(capsule.participantIds ?? []);
    const nextDateValue =
      capsule.unlockMode === "date" ? displayDateToInputValue(capsule.unlockDate) : "";
    setCapsuleDraftUnlockDateValue(nextDateValue);
    const nextDate = parseDateValue(nextDateValue);
    if (nextDate) {
      setCapsuleCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12, 0, 0));
    }
  };

  const saveCapsule = () => {
    const title = capsuleDraftTitle.trim();
    const from = capsuleDraftFrom.trim();
    const body = capsuleDraftBody.trim();
    const unlockDate =
      capsuleDraftUnlockMode === "date"
        ? inputValueToDisplayDate(capsuleDraftUnlockDateValue.trim())
        : "Open anytime";

    if (!title || !from || !body || (capsuleDraftUnlockMode === "date" && !capsuleDraftUnlockDateValue.trim())) {
      return;
    }

    const existingCapsule = timeCapsules.find((capsule) => capsule.id === selectedCapsuleId);
    const nextCapsule: TimeCapsule = {
      id: existingCapsule?.id ?? `capsule-${Date.now()}`,
      title,
      from,
      body,
      unlockMode: capsuleDraftUnlockMode,
      unlockDate,
      participantIds: capsuleDraftParticipantIds,
    };

    if (existingCapsule) {
      setTimeCapsules((current) =>
        current.map((capsule) => (capsule.id === existingCapsule.id ? nextCapsule : capsule))
      );
    } else {
      setTimeCapsules((current) => [nextCapsule, ...current]);
    }

    resetCapsuleDraft();
  };

  const removeCapsule = (capsuleId: string) => {
    setTimeCapsules((current) => current.filter((capsule) => capsule.id !== capsuleId));
    if (selectedCapsuleId === capsuleId) {
      resetCapsuleDraft();
    }
  };

  const resetEventDraft = () => {
    setSelectedEventId("");
    setEventDraftDateValue("");
    setEventDraftTitle("");
    setEventDraftDetail("");
    setEventDraftParticipantIds([]);
  };

  const loadEvent = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    const nextDateValue = calendarEventToDateValue(event);
    setEventDraftDateValue(nextDateValue);
    setEventDraftTitle(event.title);
    setEventDraftDetail(event.detail);
    setEventDraftParticipantIds(event.participantIds ?? []);
    const nextDate = parseDateValue(nextDateValue);
    if (nextDate) {
      setEventCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12, 0, 0));
    }
  };

  const saveEvent = () => {
    const dateValue = eventDraftDateValue.trim();
    const title = eventDraftTitle.trim();
    const detail = eventDraftDetail.trim();

    if (!dateValue || !title || !detail) {
      return;
    }
    const date = parseDateValue(dateValue);

    if (!date) {
      return;
    }

    const month = monthNames[date.getMonth()].slice(0, 3).toUpperCase();
    const day = String(date.getDate());

    const existingEvent = calendarEvents.find((event) => event.id === selectedEventId);
    const nextEvent: CalendarEvent = {
      id: existingEvent?.id ?? `event-${Date.now()}`,
      month,
      day,
      title,
      detail,
      dateValue,
      participantIds: eventDraftParticipantIds,
    };

    if (existingEvent) {
      setCalendarEvents((current) =>
        current.map((event) => (event.id === existingEvent.id ? nextEvent : event))
      );
    } else {
      setCalendarEvents((current) => [nextEvent, ...current]);
    }

    resetEventDraft();
  };

  const removeEvent = (eventId: string) => {
    setCalendarEvents((current) => current.filter((event) => event.id !== eventId));
    if (selectedEventId === eventId) {
      resetEventDraft();
    }
  };

  const addPhotoToEntry = (entryId: string, label: string) => {
    const cleanLabel = label.trim();

    if (!cleanLabel) {
      return;
    }

    setJournalEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              photos: [
                ...entry.photos,
                { id: `photo-${Date.now()}`, label: cleanLabel },
              ],
            }
          : entry
      )
    );
    setDraftPhotos((current) => ({ ...current, [entryId]: "" }));
  };

  const addUploadedPhotoToEntry = (entryId: string, uri: string, label: string) => {
    const cleanLabel = label.trim() || "Uploaded photo";

    setJournalEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              photos: [
                ...entry.photos,
                { id: `photo-${Date.now()}`, label: cleanLabel, uri },
              ],
            }
          : entry
      )
    );
    setDraftPhotos((current) => ({ ...current, [entryId]: "" }));
  };

  const uploadPhotoToEntry = async (entryId: string) => {
    const nextPhotoUri = await pickImageFromDevice();

    if (nextPhotoUri) {
      addUploadedPhotoToEntry(entryId, nextPhotoUri, draftPhotos[entryId] ?? "");
    }
  };

  const removePhotoFromEntry = (entryId: string, photoId: string) => {
    setJournalEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, photos: entry.photos.filter((photo) => photo.id !== photoId) }
          : entry
      )
    );
  };

  const recentPhotoIdeas = [
    "coffee receipt snapshot",
    "museum hallway mirror",
    "airport goodbye selfie",
    "playlist screenshot",
  ];

  const entryDateSummary = entryDraftDateValue
    ? formatDateRange(entryDraftDateValue)
    : "Choose the journal date";
  const capsuleDateSummary = capsuleDraftUnlockDateValue
    ? formatDateRange(capsuleDraftUnlockDateValue)
    : "Choose when this time capsule opens";
  const eventDateSummary = eventDraftDateValue
    ? formatDateRange(eventDraftDateValue)
    : "Choose the calendar date";

  const shiftEntryCalendarMonth = (offset: number) => {
    setEntryCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };
  const shiftCapsuleCalendarMonth = (offset: number) => {
    setCapsuleCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };
  const shiftEventCalendarMonth = (offset: number) => {
    setEventCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };

  const toggleCapsuleOpen = (capsuleId: string) => {
    setOpenedCapsuleIds((current) =>
      current.includes(capsuleId) ? current.filter((item) => item !== capsuleId) : [...current, capsuleId]
    );
  };

  const isCapsuleUnlocked = (capsule: TimeCapsule) => {
    if (capsule.unlockMode === "anytime") {
      return true;
    }

    const unlockDateValue = displayDateToInputValue(capsule.unlockDate);
    const unlockDate = parseDateValue(unlockDateValue);

    if (!unlockDate) {
      return false;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    return unlockDate.getTime() <= startOfToday.getTime();
  };

  return (
    <ScreenSurface>
      <SectionCard
        title="Shared journal"
        subtitle="Capture the moments that matter, not just the messages you send"
      >
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Text style={styles.feedTitle}>
              {selectedEntryId ? "Edit journal entry" : "Add a journal entry"}
            </Text>
            {selectedEntryId ? (
              <TouchableOpacity onPress={resetEntryDraft}>
                <Text style={styles.editLink}>New entry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>
              Journal date <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={entryDraftTitle}
              onChangeText={setEntryDraftTitle}
              placeholder="Journal title"
              placeholderTextColor="#A08F89"
              style={styles.textInput}
            />
            <Text style={styles.fieldLabel}>
              Title <Text style={styles.requiredMark}>*</Text>
            </Text>
            <CalendarRangePicker
              title="Journal date"
              summary={entryDateSummary}
              monthDate={entryCalendarMonth}
              startDate={entryDraftDateValue}
              isOpen={openCalendarPicker === "entry"}
              onToggle={() =>
                setOpenCalendarPicker((current) => (current === "entry" ? null : "entry"))
              }
              onShiftMonth={shiftEntryCalendarMonth}
              onSelectDate={(dateValue) => setEntryDraftDateValue(dateValue)}
              onClear={() => setEntryDraftDateValue("")}
              helperText="Choose the day this memory belongs to."
            />
            <Text style={styles.fieldLabel}>
              Memory note <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={entryDraftBody}
              onChangeText={setEntryDraftBody}
              placeholder="Write the memory..."
              placeholderTextColor="#A08F89"
              style={[styles.textInput, styles.detailInput]}
              multiline
            />
            <MultiSelectDropdown
              label="Who is this memory with?"
              selectedLabels={getParticipantNames(entryDraftParticipantIds)}
              options={connections.map((connection) => ({
                id: connection.id,
                label: connection.name,
              }))}
              isOpen={openParticipantMenu === "entry"}
              onToggleOpen={() =>
                setOpenParticipantMenu((current) => (current === "entry" ? null : "entry"))
              }
              onToggleOption={(connectionId) => toggleDraftParticipant("entry", connectionId)}
              emptyHelper="Add people in `People` first so you can tag who this memory belongs with."
            />
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={saveEntry}>
              <Text style={styles.primaryButtonText}>
                {selectedEntryId ? "Save changes" : "Add journal entry"}
              </Text>
            </TouchableOpacity>
            {selectedEntryId ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={resetEntryDraft}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {entries.length ? entries.map((entry) => (
          <View key={entry.id} style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineBadge}>
                <Text style={styles.timelineMonth}>{getJournalDateParts(entry.date).month}</Text>
                <Text style={styles.timelineDay}>{getJournalDateParts(entry.date).day}</Text>
              </View>
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{entry.title}</Text>
                <Text style={styles.timelineBody}>{entry.body}</Text>
                {getParticipantNames(entry.participantIds).length ? (
                  <Text style={styles.helperMeta}>
                    With {getParticipantNames(entry.participantIds).join(", ")}
                  </Text>
                ) : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.inlineAction} onPress={() => loadEntry(entry)}>
                    <Text style={styles.inlineActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineAction, styles.inlineActionDanger]}
                    onPress={() => removeEntry(entry.id)}
                  >
                    <Text style={styles.inlineActionDangerText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.photoStrip}>
              {entry.photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoTile}
                  onPress={() => removePhotoFromEntry(entry.id, photo.id)}
                  activeOpacity={0.9}
                >
                  {photo.uri ? (
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.photoArt}>
                      <Text style={styles.photoArtLabel}>PHOTO</Text>
                      <Text style={styles.photoArtHint}>placeholder</Text>
                    </View>
                  )}
                  <View style={styles.photoMeta}>
                    <Text style={styles.photoTileLabel}>{photo.label}</Text>
                    <Text style={styles.photoTileHint}>Tap to remove</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.photoAddTile}
                onPress={() => addPhotoToEntry(entry.id, draftPhotos[entry.id] ?? "")}
                activeOpacity={0.9}
              >
                <View style={styles.photoAddArt}>
                  <Text style={styles.photoAddPlus}>+</Text>
                </View>
                <View style={styles.photoMeta}>
                  <Text style={styles.photoAddLabel}>Add photo</Text>
                  <Text style={styles.photoAddHint}>
                    {draftPhotos[entry.id]?.trim()
                      ? "Use the draft caption below"
                      : "Name a memory below first"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.photoComposer}>
              <Text style={styles.composerLabel}>Add a photo caption or placeholder label</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draftPhotos[entry.id] ?? ""}
                  onChangeText={(value) =>
                    setDraftPhotos((current) => ({ ...current, [entry.id]: value }))
                  }
                  placeholder="ex: coffee shop selfie"
                  placeholderTextColor="#A08F89"
                  style={styles.textInput}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addPhotoToEntry(entry.id, draftPhotos[entry.id] ?? "")}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.uploadPhotoButton}
                onPress={() => void uploadPhotoToEntry(entry.id)}
              >
                <Text style={styles.uploadPhotoButtonText}>Upload photo from device</Text>
              </TouchableOpacity>
              <View style={styles.ideaWrap}>
                {recentPhotoIdeas.map((idea) => (
                  <TouchableOpacity
                    key={`${entry.id}-${idea}`}
                    style={styles.ideaChip}
                    onPress={() => addPhotoToEntry(entry.id, idea)}
                  >
                    <Text style={styles.ideaChipText}>{idea}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Your shared journal starts blank. Add your first memory once you begin using the app together.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Time capsule"
        subtitle="Leave something meaningful for later"
      >
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Text style={styles.feedTitle}>
              {selectedCapsuleId ? "Edit time capsule" : "Add a time capsule"}
            </Text>
            {selectedCapsuleId ? (
              <TouchableOpacity onPress={resetCapsuleDraft}>
                <Text style={styles.editLink}>New capsule</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>
              Capsule title <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={capsuleDraftTitle}
              onChangeText={setCapsuleDraftTitle}
              placeholder="Capsule title"
              placeholderTextColor="#A08F89"
              style={styles.textInput}
            />
            <Text style={styles.fieldLabel}>
              From <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={capsuleDraftFrom}
              onChangeText={setCapsuleDraftFrom}
              placeholder="From"
              placeholderTextColor="#A08F89"
              style={styles.textInput}
            />
            <Text style={styles.fieldLabel}>
              Letter content <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={capsuleDraftBody}
              onChangeText={setCapsuleDraftBody}
              placeholder="What do you want to send?"
              placeholderTextColor="#A08F89"
              style={[styles.textInput, styles.detailInput]}
              multiline
            />
            <Text style={styles.fieldLabel}>
              Unlock mode <Text style={styles.requiredMark}>*</Text>
            </Text>
            <View style={styles.selectWrap}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setOpenCapsuleModeMenu((current) => !current)}
              >
                <Text style={styles.selectButtonText}>
                  {capsuleDraftUnlockMode === "date" ? "Open on a set date" : "Open anytime"}
                </Text>
                <Text style={styles.selectChevron}>{openCapsuleModeMenu ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {openCapsuleModeMenu ? (
                <View style={styles.optionList}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      setCapsuleDraftUnlockMode("date");
                      setOpenCapsuleModeMenu(false);
                    }}
                  >
                    <Text style={styles.optionText}>Open on a set date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      setCapsuleDraftUnlockMode("anytime");
                      setOpenCapsuleModeMenu(false);
                    }}
                  >
                    <Text style={styles.optionText}>Open anytime, like a comfort letter</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {capsuleDraftUnlockMode === "date" ? (
              <>
                <Text style={styles.fieldLabel}>
                  Unlock date <Text style={styles.requiredMark}>*</Text>
                </Text>
                <CalendarRangePicker
                  title="Unlock date"
                  summary={capsuleDateSummary}
                  monthDate={capsuleCalendarMonth}
                  startDate={capsuleDraftUnlockDateValue}
                  isOpen={openCalendarPicker === "capsule"}
                  onToggle={() =>
                    setOpenCalendarPicker((current) => (current === "capsule" ? null : "capsule"))
                  }
                  onShiftMonth={shiftCapsuleCalendarMonth}
                  onSelectDate={(dateValue) => setCapsuleDraftUnlockDateValue(dateValue)}
                  onClear={() => setCapsuleDraftUnlockDateValue("")}
                  helperText="Use this for future-only letters that stay locked until that date."
                />
              </>
            ) : null}
            <MultiSelectDropdown
              label="Who is this capsule for?"
              selectedLabels={getParticipantNames(capsuleDraftParticipantIds)}
              options={connections.map((connection) => ({
                id: connection.id,
                label: connection.name,
              }))}
              isOpen={openParticipantMenu === "capsule"}
              onToggleOpen={() =>
                setOpenParticipantMenu((current) => (current === "capsule" ? null : "capsule"))
              }
              onToggleOption={(connectionId) => toggleDraftParticipant("capsule", connectionId)}
              emptyHelper="Add people in `People` first so you can target this capsule."
            />
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={saveCapsule}>
              <Text style={styles.primaryButtonText}>
                {selectedCapsuleId ? "Save capsule" : "Add time capsule"}
              </Text>
            </TouchableOpacity>
            {selectedCapsuleId ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={resetCapsuleDraft}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {timeCapsules.length ? timeCapsules.map((capsule) => (
          <View key={capsule.id} style={styles.feedCard}>
            <View style={styles.capsuleBadge}>
              <Text style={styles.capsuleBadgeText}>TC</Text>
            </View>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>{capsule.title}</Text>
              <Text style={styles.feedMeta}>
                {capsule.unlockMode === "date"
                  ? `Opens on ${capsule.unlockDate}`
                  : "Open anytime"}{" "}
                | From {capsule.from}
              </Text>
              {getParticipantNames(capsule.participantIds).length ? (
                <Text style={styles.helperMeta}>
                  For {getParticipantNames(capsule.participantIds).join(", ")}
                </Text>
              ) : null}
              {isCapsuleUnlocked(capsule) ? (
                openedCapsuleIds.includes(capsule.id) ? (
                  <>
                    <Text style={styles.feedMeta}>{capsule.body}</Text>
                    <TouchableOpacity
                      style={styles.inlineAction}
                      onPress={() => toggleCapsuleOpen(capsule.id)}
                    >
                      <Text style={styles.inlineActionText}>Close</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.inlineAction}
                    onPress={() => toggleCapsuleOpen(capsule.id)}
                  >
                    <Text style={styles.inlineActionText}>Open</Text>
                  </TouchableOpacity>
                )
              ) : (
                <Text style={styles.helperMeta}>Locked until the chosen date.</Text>
              )}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.inlineAction} onPress={() => loadCapsule(capsule)}>
                  <Text style={styles.inlineActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineAction, styles.inlineActionDanger]}
                  onPress={() => removeCapsule(capsule.id)}
                >
                  <Text style={styles.inlineActionDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Time capsules will show up here after you save your first message for later.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Shared calendar"
        subtitle="Stay aligned on rituals, travel, birthdays, and intentional time together"
      >
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Text style={styles.feedTitle}>
              {selectedEventId ? "Edit calendar event" : "Add a calendar event"}
            </Text>
            {selectedEventId ? (
              <TouchableOpacity onPress={resetEventDraft}>
                <Text style={styles.editLink}>New event</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>
              Calendar date <Text style={styles.requiredMark}>*</Text>
            </Text>
            <CalendarRangePicker
              title="Calendar date"
              summary={eventDateSummary}
              monthDate={eventCalendarMonth}
              startDate={eventDraftDateValue}
              isOpen={openCalendarPicker === "event"}
              onToggle={() =>
                setOpenCalendarPicker((current) => (current === "event" ? null : "event"))
              }
              onShiftMonth={shiftEventCalendarMonth}
              onSelectDate={(dateValue) => setEventDraftDateValue(dateValue)}
              onClear={() => setEventDraftDateValue("")}
              helperText="Choose the day this ritual, trip, or reminder belongs on."
            />
            <Text style={styles.fieldLabel}>
              Event title <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={eventDraftTitle}
              onChangeText={setEventDraftTitle}
              placeholder="Event title"
              placeholderTextColor="#A08F89"
              style={styles.textInput}
            />
            <Text style={styles.fieldLabel}>
              Event details <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={eventDraftDetail}
              onChangeText={setEventDraftDetail}
              placeholder="Event details"
              placeholderTextColor="#A08F89"
              style={[styles.textInput, styles.detailInput]}
              multiline
            />
            <MultiSelectDropdown
              label="Who is this for?"
              selectedLabels={getParticipantNames(eventDraftParticipantIds)}
              options={connections.map((connection) => ({
                id: connection.id,
                label: connection.name,
              }))}
              isOpen={openParticipantMenu === "event"}
              onToggleOpen={() =>
                setOpenParticipantMenu((current) => (current === "event" ? null : "event"))
              }
              onToggleOption={(connectionId) => toggleDraftParticipant("event", connectionId)}
              emptyHelper="Add people in `People` first so you can assign this event."
            />
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={saveEvent}>
              <Text style={styles.primaryButtonText}>
                {selectedEventId ? "Save event" : "Add calendar event"}
              </Text>
            </TouchableOpacity>
            {selectedEventId ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={resetEventDraft}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {calendarEvents.length ? calendarEvents.map((event) => (
          <View key={event.id} style={styles.calendarRow}>
            <View style={styles.calendarDate}>
              <Text style={styles.calendarDateMonth}>{event.month}</Text>
              <Text style={styles.calendarDateDay}>{event.day}</Text>
            </View>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>{event.title}</Text>
              <Text style={styles.feedMeta}>{event.detail}</Text>
              {getParticipantNames(event.participantIds).length ? (
                <Text style={styles.helperMeta}>
                  With {getParticipantNames(event.participantIds).join(", ")}
                </Text>
              ) : null}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.inlineAction} onPress={() => loadEvent(event)}>
                  <Text style={styles.inlineActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineAction, styles.inlineActionDanger]}
                  onPress={() => removeEvent(event.id)}
                >
                  <Text style={styles.inlineActionDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Your shared calendar is empty right now. Trips, rituals, and visits will appear here once you create them.
            </Text>
          </View>
        )}
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  editorCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 12,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  inputStack: {
    gap: 10,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  requiredMark: {
    color: palette.berry,
  },
  timelineCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 14,
  },
  timelineHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  timelineBadge: {
    width: 60,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineMonth: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timelineDay: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
  },
  timelineTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  timelineBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  photoStrip: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  photoTile: {
    width: 128,
    borderRadius: 20,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: 96,
    borderBottomWidth: 1,
    borderBottomColor: "#F0DDD3",
    backgroundColor: "#F7E8DA",
  },
  photoArt: {
    minHeight: 96,
    backgroundColor: "#F7E8DA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0DDD3",
  },
  photoArtLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  photoArtHint: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  photoMeta: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  photoTileLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  photoTileHint: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  photoAddTile: {
    width: 128,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E6CDBE",
    backgroundColor: "#FFFBF7",
    overflow: "hidden",
  },
  photoAddArt: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0DDD3",
    backgroundColor: "#FFF6ED",
  },
  photoAddPlus: {
    color: palette.berry,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "300",
  },
  photoAddLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  photoAddHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  photoComposer: {
    gap: 10,
  },
  composerLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 14,
  },
  detailInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  addButton: {
    borderRadius: 18,
    backgroundColor: palette.text,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.text,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  inlineAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4D1C8",
    backgroundColor: "#FFF6EF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  inlineActionDanger: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F2C7C2",
  },
  inlineActionDangerText: {
    color: "#B5544B",
    fontSize: 12,
    fontWeight: "700",
  },
  editLink: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
  },
  selectWrap: {
    gap: 8,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  selectChevron: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  optionList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1E3DA",
  },
  optionText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  uploadPhotoButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5CFC4",
    backgroundColor: "#FFF6EF",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  uploadPhotoButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  ideaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ideaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F4E6DF",
    backgroundColor: "#FFF1E7",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ideaChipText: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
  },
  feedCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  capsuleBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.lavender,
    borderWidth: 1,
    borderColor: "#E6D6F3",
  },
  capsuleBadgeText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 12,
  },
  feedCopy: {
    flex: 1,
    gap: 3,
  },
  feedTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  calendarRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  calendarDate: {
    width: 60,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F4E6DF",
  },
  calendarDateMonth: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  calendarDateDay: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
  },
});

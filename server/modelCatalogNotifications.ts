export interface ModelCatalogEntry {
  id: string;
  name: string;
  provider: string;
  type: string;
}

export interface ModelCatalogNotification {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  type: string;
  discoveredAt: string;
}

export interface ModelCatalogHistory {
  checkedAt: string;
  knownModelIds: string[];
  notifications: ModelCatalogNotification[];
}

const MAX_NOTIFICATIONS = 100;

export function updateModelCatalogHistory(
  previous: ModelCatalogHistory | null,
  currentModels: ModelCatalogEntry[],
  checkedAt: string,
): ModelCatalogHistory {
  const uniqueModels = [...currentModels.reduce((models, model) => {
    if (!models.has(model.id)) models.set(model.id, model);
    return models;
  }, new Map<string, ModelCatalogEntry>()).values()];
  if (!previous) {
    return {
      checkedAt,
      knownModelIds: uniqueModels.map(model => model.id),
      notifications: [],
    };
  }

  const known = new Set(previous.knownModelIds);
  const discoveries = uniqueModels
    .filter(model => !known.has(model.id))
    .map(model => ({
      id: `${model.id}@${checkedAt}`,
      modelId: model.id,
      name: model.name,
      provider: model.provider,
      type: model.type,
      discoveredAt: checkedAt,
    }));

  return {
    checkedAt,
    knownModelIds: [...previous.knownModelIds, ...discoveries.map(item => item.modelId)],
    notifications: [...discoveries, ...previous.notifications].slice(0, MAX_NOTIFICATIONS),
  };
}

export function unreadModelNotifications(history: ModelCatalogHistory, readAt?: string | null) {
  if (!readAt) return history.notifications;
  const timestamp = Date.parse(readAt);
  if (!Number.isFinite(timestamp)) return history.notifications;
  return history.notifications.filter(notification => Date.parse(notification.discoveredAt) > timestamp);
}

"""
Forecasting Engine
--------------------
Simple, explainable forecasting: ordinary-least-squares linear trend plus
optional moving-average smoothing. This is intentionally not a black-box
ML model — for an MVP financial advisor, a forecast an operator can sanity
check (and that a validation node can bound-check) is worth more than a
marginally more accurate model nobody can explain.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class ForecastPoint:
    period_index: int
    value: float


@dataclass
class ForecastResult:
    method: str
    slope: float
    intercept: float
    r_squared: float
    history: list[ForecastPoint]
    forecast: list[ForecastPoint]


class ForecastingEngine:
    def __init__(self, min_history_points: int = 3) -> None:
        self.min_history_points = min_history_points

    def forecast_linear(
        self, series: list[float], periods_ahead: int = 3
    ) -> ForecastResult:
        if len(series) < self.min_history_points:
            raise ValueError(
                f"Need at least {self.min_history_points} historical points, "
                f"got {len(series)}"
            )
        if periods_ahead < 1:
            raise ValueError("periods_ahead must be >= 1")

        x = np.arange(len(series), dtype=float)
        y = np.array(series, dtype=float)

        slope, intercept = np.polyfit(x, y, 1)

        y_pred = slope * x + intercept
        ss_res = float(np.sum((y - y_pred) ** 2))
        ss_tot = float(np.sum((y - np.mean(y)) ** 2))
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0

        history = [
            ForecastPoint(period_index=i, value=round(float(v), 2))
            for i, v in enumerate(series)
        ]
        future_x = np.arange(len(series), len(series) + periods_ahead, dtype=float)
        forecast = [
            ForecastPoint(period_index=int(i), value=round(float(slope * i + intercept), 2))
            for i in future_x
        ]

        return ForecastResult(
            method="linear_ols",
            slope=round(float(slope), 4),
            intercept=round(float(intercept), 4),
            r_squared=round(float(r_squared), 4),
            history=history,
            forecast=forecast,
        )

    def moving_average(self, series: list[float], window: int = 3) -> list[float]:
        if window < 1:
            raise ValueError("window must be >= 1")
        if len(series) < window:
            raise ValueError(f"series shorter than window ({len(series)} < {window})")
        arr = np.array(series, dtype=float)
        kernel = np.ones(window) / window
        smoothed = np.convolve(arr, kernel, mode="valid")
        return [round(float(v), 2) for v in smoothed]

import { useQuery, gql } from "@apollo/client";
import "moment-timezone";
import moment from "moment";
import React, { useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import _ from "lodash";
import { CharacterSnapshotSearchAggregationsResponse } from "../../../__generated__/graphql";
import { useState } from "react";
import { usePoeLeagueCtx } from "@contexts/league-context";
import LeagueSelect from "@components/league-select";

export default function LadderMeta() {
  const { league } = usePoeLeagueCtx();

  const [resp, setResp] =
    useState<CharacterSnapshotSearchAggregationsResponse | null>(null);
  useQuery(
    gql`
      query CharacterSnapshotsSearchAggregations(
        $aggregationTypes: [String!]!
        $search: CharacterSnapshotSearch!
      ) {
        characterSnapshotsSearchAggregations(
          aggregationTypes: $aggregationTypes
          search: $search
        ) {
          levelTimeseriesAggregation {
            values {
              key
              timestamp
              value
            }
          }
          mainSkillTimeseriesAggregation {
            values {
              key
              timestamp
              value
            }
          }
          characterClassTimeseriesAggregation {
            values {
              key
              timestamp
              value
            }
          }
        }
      }
    `,
    {
      variables: {
        search: {
          league: league,
        },
        aggregationTypes: [
          "classes-timeseries",
          "main-skills-timeseries",
          "levels-timeseries",
        ],
      },
      onCompleted(data) {
        setResp(data.characterSnapshotsSearchAggregations);
      },
    }
  );

  if (!resp) {
    return <>loading..</>;
  }

  return (
    <>
      <div className="space-y-2">
        <LeagueSelect />

        <MetaTimeseriesChart
          values={resp?.characterClassTimeseriesAggregation?.values ?? []}
        />
        <MetaTimeseriesChart
          values={resp?.mainSkillTimeseriesAggregation?.values ?? []}
        />
      </div>
    </>
  );
}

export function MetaTimeseriesChart({
  values,
}: {
  values: {
    key?: string | undefined | null;
    value?: number | undefined | null;
    timestamp?: string | undefined | null;
  }[];
}) {
  const grouped = _.groupBy(values, "key");

  const series = Object.values(grouped).map((v) => {
    const data = v?.map((s) => {
      return [new Date(s?.timestamp ?? 0).valueOf(), s.value];
    });
    data.sort((a, b) => (a[0]?.valueOf() ?? 0) - (b[0]?.valueOf() ?? 0));

    return {
      name: v[0]?.key,
      tooltip: {
        valueDecimals: 0,
      },
      data: data,
    };
  });

  series.sort((a, b) => (a.data?.[0]?.[1] ?? 0) - (b.data?.[0]?.[1] ?? 0));

  const options = {
    chart: {
      type: "column",
    },
    title: {
      text: "",
    },
    time: {
      moment: moment,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    yAxis: {
      title: {
        enabled: false,
      },
      stackLabels: {
        enabled: true,
      },
    },
    plotOptions: {
      column: {
        stacking: "percent",
      },
    },
    xAxis: {
      type: "datetime",
      dateTimeLabelFormats: {
        minute: "%l:%M %P",
        hour: "%l:%M %P",
        day: "%e. %b",
        week: "%e. %b",
        month: "%b '%y",
        year: "%Y",
      },
    },
    legend: {
      enabled: true,
      itemStyle: {
        color: "white",
      },
    },
    series: series.filter((e) => !!e?.name).slice(-10),
  };

  return (
    <>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </>
  );
}

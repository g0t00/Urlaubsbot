import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Grid } from "@material-ui/core";
import React from "react";
import { IGroupData } from "../interfaces";
import { roundToCent } from "../util";

export function MoneySplit({ groupData }: { groupData: IGroupData }) {

  return <Grid container spacing={10}>
    {(groupData?.members ?? []).map((member, i) => <Grid item xs={12} sm={6} md={6} key={i}>
      <Card>
        <CardContent>
          <Typography gutterBottom variant="h5" component="h2">
            {member.name}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  Description
                </TableCell>
                <TableCell>
                  Part
                </TableCell>
                <TableCell>
                  Total
                </TableCell>
                <TableCell>
                  %
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(member.hasToPayEntries).map(entry =>
                <TableRow>
                  <TableCell>
                    {entry.description}
                  </TableCell>
                  <TableCell>
                    {roundToCent(entry.partialAmount)}
                  </TableCell>
                  <TableCell>
                    {entry.amount}
                  </TableCell>
                  <TableCell>
                    {Math.round(entry.partialAmount * 100 / entry.amount) }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Grid>)}
  </Grid>;
}
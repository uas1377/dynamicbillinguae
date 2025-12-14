import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import BuildingFlatSelector from "@/components/ui/BuildingFlatSelector";
import { getStoredFlats, updateFlatPhoneInStorage } from "@/utils/buildingFlatStorage";

const AddCustomer = () => {
  const [phone, setPhone] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedBuilding) {
      toast.error('Please select a building');
      return;
    }

    if (!selectedFlat) {
      toast.error('Please select a flat');
      return;
    }

    try {
      const trimmedPhone = phone.trim();
      const updatedAllFlats = updateFlatPhoneInStorage(
        selectedFlat,
        trimmedPhone || null
      );

      // Refresh flats state for the selected building only
      const buildingFlats = updatedAllFlats.filter(
        (flat) => flat.building_id === selectedBuilding
      );
      setFlats(buildingFlats);

      const updatedFlat = getStoredFlats().find(
        (flat) => flat.id === selectedFlat
      );

      if (trimmedPhone) {
        toast.success('Phone number saved for this flat/house');
      } else if (updatedFlat && !updatedFlat.phone) {
        toast.info('Flat/house saved without phone (optional)');
      } else {
        toast.success('Flat/house details updated');
      }

      setPhone('');
      setSelectedBuilding(selectedBuilding);
      setSelectedFlat(selectedFlat);
    } catch (error) {
      toast.error('Failed to save flat details: ' + error.message);
    }
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Add Building / Flat (House)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BuildingFlatSelector
            selectedBuilding={selectedBuilding}
            setSelectedBuilding={setSelectedBuilding}
            selectedFlat={selectedFlat}
            setSelectedFlat={setSelectedFlat}
            buildings={buildings}
            setBuildings={setBuildings}
            flats={flats}
            setFlats={setFlats}
          />

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              placeholder="Enter phone number for this flat/house"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="gradient-primary text-white border-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Save Flat / House
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCustomer;
